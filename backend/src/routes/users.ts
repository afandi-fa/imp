import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { auth } from "../lib/auth.js";
import { db } from "../db/index.js";
import { instances } from "../db/schema/index.js";
import { eq, and, inArray } from "drizzle-orm";

type HonoVariables = {
  user: { id: string; role?: string; email?: string; name?: string };
  session: { id: string; userId: string };
};

const app = new Hono<{ Variables: HonoVariables }>();

// ─── Schema & Validators ────────────────────────────────────────────────────

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

const setRoleSchema = z.object({
  role: z.enum(["user", "admin", "superAdmin"]),
});

const banSchema = z.object({
  banReason: z.string().min(1).optional(),
  banExpiresAt: z.coerce.date().optional(), // undefined = permanent
});

// ─── GET /api/users ─────────────────────────────────────────────────────────
// List semua users dengan pagination. Admin & superAdmin boleh akses.

app.get(
  "/",
  requireAuth,
  requireRole("admin", "superAdmin"),
  zValidator("query", paginationSchema),
  async (c) => {
    const { page, limit, search } = c.req.valid("query");

    // Better Auth admin API: listUsers
    const result = await auth.api.listUsers({
      headers: c.req.raw.headers,
      query: {
        limit,
        offset: (page - 1) * limit,
        ...(search ? { searchField: "email", searchValue: search, searchOperator: "contains" } : {}),
        sortBy: "createdAt",
        sortDirection: "desc",
      },
    });

    // Enrich dengan jumlah instance aktif per user
    const userIds = result.users.map((u) => u.id);

    const instanceCounts =
      userIds.length > 0
        ? await db
            .select({
              userId: instances.userId,
              // count via raw expression agar bisa group by
            })
            .from(instances)
            .where(
              and(
                inArray(instances.userId, userIds),
                inArray(instances.status, ["running", "stopped"]) // exclude terminated
              )
            )
        : [];

    // Hitung count per userId secara manual (hindari N+1)
    const countMap: Record<string, number> = {};
    for (const row of instanceCounts) {
      countMap[row.userId] = (countMap[row.userId] ?? 0) + 1;
    }

    const enriched = result.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      banned: u.banned ?? false,
      banReason: u.banReason ?? null,
      banExpiresAt: u.banExpires ?? null,
      activeInstances: countMap[u.id] ?? 0,
      createdAt: u.createdAt,
    }));

    return c.json({
      data: {
        users: enriched,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
      error: null,
    });
  }
);

// ─── GET /api/users/:id ──────────────────────────────────────────────────────
// Detail user. Admin & superAdmin boleh akses.

app.get(
  "/:id",
  requireAuth,
  requireRole("admin", "superAdmin"),
  async (c) => {
    const userId = c.req.param("id") ?? "";

    const result = await auth.api.listUsers({
      headers: c.req.raw.headers,
      query: { limit: 1, offset: 0, filterField: "id", filterValue: userId },
    });

    const user = result.users[0];
    if (!user) {
      return c.json({ data: null, error: { message: "User not found", code: "USER_NOT_FOUND" } }, 404);
    }

    // Instance milik user ini
    const userInstances = await db
      .select()
      .from(instances)
      .where(eq(instances.userId, userId));

    return c.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned ?? false,
        banReason: user.banReason ?? null,
        banExpiresAt: user.banExpires ?? null,
        createdAt: user.createdAt,
        instances: userInstances,
      },
      error: null,
    });
  }
);

// ─── POST /api/users/:id/ban ──────────────────────────────────────────────────
// Ban user + suspend semua instance aktif. Admin & superAdmin boleh akses.

app.post(
  "/:id/ban",
  requireAuth,
  requireRole("admin", "superAdmin"),
  zValidator("json", banSchema),
  async (c) => {
    const userId = c.req.param("id") ?? "";
    const { banReason, banExpiresAt } = c.req.valid("json");
    const currentUser = c.get("user") as { id: string; role?: string };

    // Cegah admin mem-ban dirinya sendiri
    if (currentUser.id === userId) {
      return c.json(
        { data: null, error: { message: "Cannot ban yourself", code: "SELF_BAN_FORBIDDEN" } },
        403
      );
    }

    // Cek user target — pastikan ada dan bukan superAdmin jika yang nge-ban admin biasa
    const targetResult = await auth.api.listUsers({
      headers: c.req.raw.headers,
      query: { limit: 1, offset: 0, filterField: "id", filterValue: userId },
    });
    const target = targetResult.users[0];

    if (!target) {
      return c.json({ data: null, error: { message: "User not found", code: "USER_NOT_FOUND" } }, 404);
    }

    // Admin biasa tidak boleh ban superAdmin
    if (currentUser.role === "admin" && target.role === "superAdmin") {
      return c.json(
        { data: null, error: { message: "Insufficient permission to ban superAdmin", code: "FORBIDDEN" } },
        403
      );
    }

    // Transaksi: ban user + suspend instance aktif
    await db.transaction(async (tx) => {
      // Suspend semua instance running milik user (updatedAt tidak ada di schema)
      await tx
        .update(instances)
        .set({ status: "stopped" })
        .where(and(eq(instances.userId, userId), eq(instances.status, "running")));

      // Ban via Better Auth admin API
      await auth.api.banUser({
        headers: c.req.raw.headers,
        body: {
          userId,
          banReason,
          banExpiresIn: banExpiresAt
            ? Math.floor((banExpiresAt.getTime() - Date.now()) / 1000)
            : undefined,
        },
      });
    });

    return c.json({ data: { success: true }, error: null });
  }
);

// ─── POST /api/users/:id/unban ────────────────────────────────────────────────
// Unban user. Admin & superAdmin boleh akses.

app.post(
  "/:id/unban",
  requireAuth,
  requireRole("admin", "superAdmin"),
  async (c) => {
    const userId = c.req.param("id") ?? "";

    await auth.api.unbanUser({
      headers: c.req.raw.headers,
      body: { userId },
    });

    return c.json({ data: { success: true }, error: null });
  }
);

// ─── PATCH /api/users/:id/role ────────────────────────────────────────────────
// Set role. Hanya superAdmin yang boleh akses endpoint ini.

app.patch(
  "/:id/role",
  requireAuth,
  requireRole("superAdmin"), // admin biasa tidak boleh
  zValidator("json", setRoleSchema),
  async (c) => {
    const userId = c.req.param("id") ?? "";
    const { role } = c.req.valid("json");
    const currentUser = c.get("user") as { id: string };

    // Cegah superAdmin menurunkan role dirinya sendiri
    if (currentUser.id === userId) {
      return c.json(
        { data: null, error: { message: "Cannot change your own role", code: "SELF_ROLE_CHANGE_FORBIDDEN" } },
        403
      );
    }

    await auth.api.setRole({
      headers: c.req.raw.headers,
      body: { userId, role },
    });

    return c.json({ data: { success: true, role }, error: null });
  }
);

export default app;
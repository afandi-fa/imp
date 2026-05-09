import { useState, useCallback } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "../lib/auth-client.js";
import {
  useUsers,
  useBanUser,
  useUnbanUser,
  useSetRole,
  type UserListItem,
  type UserRole,
} from "../hooks/useUsers.js";

// ─── Route guard — admin & superAdmin only ────────────────────────────────────

export const Route = createFileRoute("/users")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session?.data?.user) throw redirect({ to: "/login" });
    const role = session.data.user.role as UserRole;
    if (role !== "admin" && role !== "superAdmin") {
      throw redirect({ to: "/dashboard" });
    }
    return { currentUser: session.data.user };
  },
  component: UsersPage,
});

// ─── Modal: Ban ───────────────────────────────────────────────────────────────

function BanModal({
  user,
  onClose,
  onConfirm,
  isPending,
}: {
  user: UserListItem;
  onClose: () => void;
  onConfirm: (data: { banReason?: string; banExpiresAt?: string }) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Ban User</h2>
        <p className="mb-4 text-sm text-gray-500">
          Memban <span className="font-medium">{user.email}</span> akan
          mensuspend semua instance aktif miliknya.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Alasan (opsional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Melanggar ToS"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Ban sampai (kosongkan untuk permanen)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={() =>
              onConfirm({
                banReason: reason || undefined,
                banExpiresAt: expiresAt
                  ? new Date(expiresAt).toISOString()
                  : undefined,
              })
            }
            disabled={isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? "Memban..." : "Ban User"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Set Role ──────────────────────────────────────────────────────────

function SetRoleModal({
  user,
  onClose,
  onConfirm,
  isPending,
}: {
  user: UserListItem;
  onClose: () => void;
  onConfirm: (role: UserRole) => void;
  isPending: boolean;
}) {
  const [role, setRole] = useState<UserRole>(user.role);
  const roles: { value: UserRole; label: string }[] = [
    { value: "user", label: "User" },
    { value: "admin", label: "Admin" },
    { value: "superAdmin", label: "Super Admin" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Set Role</h2>
        <p className="mb-4 text-sm text-gray-500">
          Ubah role untuk <span className="font-medium">{user.email}</span>
        </p>

        <div className="space-y-2">
          {roles.map((r) => (
            <label
              key={r.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={role === r.value}
                onChange={() => setRole(r.value)}
                className="accent-blue-600"
              />
              <span className="text-sm font-medium text-gray-800">
                {r.label}
              </span>
            </label>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={() => onConfirm(role)}
            disabled={isPending || role === user.role}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    superAdmin: "bg-purple-100 text-purple-700",
    admin: "bg-blue-100 text-blue-700",
    user: "bg-gray-100 text-gray-600",
  };
  const labels: Record<UserRole, string> = {
    superAdmin: "Super Admin",
    admin: "Admin",
    user: "User",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[role]}`}
    >
      {labels[role]}
    </span>
  );
}

function StatusBadge({ banned }: { banned: boolean }) {
  return banned ? (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
      Banned
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
      Aktif
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function UsersPage() {
  const { currentUser } = Route.useRouteContext();
  const isSuperAdmin = (currentUser.role as UserRole) === "superAdmin";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchTimer, setSearchTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const handleSearch = useCallback(
    (val: string) => {
      setSearch(val);
      if (searchTimer) clearTimeout(searchTimer);
      const t = setTimeout(() => {
        setDebouncedSearch(val);
        setPage(1);
      }, 400);
      setSearchTimer(t);
    },
    [searchTimer]
  );

  const { data, isLoading, isError, isFetching } = useUsers({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  });

  const banMutation = useBanUser();
  const unbanMutation = useUnbanUser();
  const setRoleMutation = useSetRole();

  const [banTarget, setBanTarget] = useState<UserListItem | null>(null);
  const [roleTarget, setRoleTarget] = useState<UserListItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleBanConfirm = async (payload: {
    banReason?: string;
    banExpiresAt?: string;
  }) => {
    if (!banTarget) return;
    try {
      await banMutation.mutateAsync({ userId: banTarget.id, ...payload });
      setBanTarget(null);
    } catch (e) {
      setErrorMsg((e as Error).message);
    }
  };

  const handleUnban = async (userId: string) => {
    try {
      await unbanMutation.mutateAsync(userId);
    } catch (e) {
      setErrorMsg((e as Error).message);
    }
  };

  const handleRoleConfirm = async (role: UserRole) => {
    if (!roleTarget) return;
    try {
      await setRoleMutation.mutateAsync({ userId: roleTarget.id, role });
      setRoleTarget(null);
    } catch (e) {
      setErrorMsg((e as Error).message);
    }
  };

  // Pagination helpers
  const buildPageNumbers = (
    totalPages: number,
    current: number
  ): (number | "...")[] => {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
      (p) => p === 1 || p === totalPages || Math.abs(p - current) <= 2
    );
    return pages.reduce<(number | "...")[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="mt-1 text-sm text-gray-500">
              Kelola akun pengguna, role, dan status ban.
            </p>
          </div>
          {data && (
            <span className="mt-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
              {data.total} total
            </span>
          )}
        </div>

        {/* Error toast */}
        {errorMsg && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="ml-4 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cari email pengguna..."
            className="w-full max-w-sm rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Table */}
        <div
          className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-opacity ${
            isFetching ? "opacity-70" : ""
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-sm text-gray-400">
              Memuat data...
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-20 text-sm text-red-500">
              Gagal memuat data. Coba refresh.
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">
                      User
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      Role
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">
                      Instances
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      Bergabung
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data?.users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-gray-400"
                      >
                        Tidak ada user ditemukan.
                      </td>
                    </tr>
                  ) : (
                    data?.users.map((user) => (
                      <tr
                        key={user.id}
                        className="transition-colors hover:bg-gray-50/60"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {user.email}
                          </div>
                          {user.banReason && (
                            <div className="mt-0.5 text-xs text-red-500">
                              Alasan: {user.banReason}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <RoleBadge role={user.role} />
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge banned={user.banned} />
                        </td>

                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                          {user.activeInstances}
                        </td>

                        <td className="px-4 py-3 text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {user.banned ? (
                              <button
                                onClick={() => handleUnban(user.id)}
                                disabled={unbanMutation.isPending}
                                className="rounded-md bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
                              >
                                Unban
                              </button>
                            ) : (
                              <button
                                onClick={() => setBanTarget(user)}
                                className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                              >
                                Ban
                              </button>
                            )}

                            {isSuperAdmin && (
                              <button
                                onClick={() => setRoleTarget(user)}
                                className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                              >
                                Set Role
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                  <span className="text-xs text-gray-500">
                    Halaman {data.page} dari {data.totalPages} ({data.total}{" "}
                    user)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => p - 1)}
                      disabled={page === 1 || isFetching}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    >
                      ← Prev
                    </button>

                    {buildPageNumbers(data.totalPages, page).map((p, i) =>
                      p === "..." ? (
                        <span
                          key={`ellipsis-${i}`}
                          className="px-1 py-1.5 text-xs text-gray-400"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p as number)}
                          disabled={isFetching}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            page === p
                              ? "bg-blue-600 text-white"
                              : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}

                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page === data.totalPages || isFetching}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {banTarget && (
        <BanModal
          user={banTarget}
          onClose={() => setBanTarget(null)}
          onConfirm={handleBanConfirm}
          isPending={banMutation.isPending}
        />
      )}
      {roleTarget && (
        <SetRoleModal
          user={roleTarget}
          onClose={() => setRoleTarget(null)}
          onConfirm={handleRoleConfirm}
          isPending={setRoleMutation.isPending}
        />
      )}
    </div>
  );
}
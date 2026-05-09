import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { api } from "../lib/api.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserRole = "user" | "admin" | "superAdmin";

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  banned: boolean;
  banReason: string | null;
  banExpiresAt: string | null;
  activeInstances: number;
  createdAt: string;
}

export interface UsersPage {
  users: UserListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UsersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (params: UsersQueryParams) => [...userKeys.lists(), params] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useUsers(params: UsersQueryParams = {}) {
  const { page = 1, limit = 20, search } = params;

  return useQuery<UsersPage>({
    queryKey: userKeys.list({ page, limit, search }),
    queryFn: async () => {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
      });
      const res = await api<UsersPage>(`/api/users?${query}`);
      if (res.error) throw new Error(res.error.message);
      return res.data!;
    },
    placeholderData: keepPreviousData,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => {
      const res = await api<unknown>(`/api/users/${id}`);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useBanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      banReason,
      banExpiresAt,
    }: {
      userId: string;
      banReason?: string;
      banExpiresAt?: string;
    }) => {
      const res = await api<{ success: boolean }>(`/api/users/${userId}/ban`, {
        method: "POST",
        body: JSON.stringify({ banReason, banExpiresAt }),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useUnbanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await api<{ success: boolean }>(`/api/users/${userId}/unban`, {
        method: "POST",
      });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useSetRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const res = await api<{ success: boolean; role: UserRole }>(
        `/api/users/${userId}/role`,
        {
          method: "PATCH",
          body: JSON.stringify({ role }),
        }
      );
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
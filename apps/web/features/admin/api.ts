"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  AdminFinance,
  AdminMetrics,
  AdminReport,
  AdminTeam,
  AdminUser,
  AdminUserDetail,
  FinancePeriod,
  Paged,
  ReportAction,
  ReportStatus,
  TournamentEvent,
  TournamentInput,
  UserStatus,
} from "./types";

const ADMIN_KEY = ["admin"] as const;
export const TOURNAMENTS_KEY = ["tournaments"] as const;

function queryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function useAdminMetrics() {
  return useQuery({
    queryKey: [...ADMIN_KEY, "metrics"],
    queryFn: () => api<AdminMetrics>("/admin/metrics"),
  });
}

export function useAdminFinance(days: FinancePeriod) {
  return useQuery({
    queryKey: [...ADMIN_KEY, "finance", days],
    queryFn: () => api<AdminFinance>(`/admin/finance?days=${days}`),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: [...ADMIN_KEY, "users", "detail", id],
    queryFn: () => api<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`),
  });
}

export function useAdminUsers(params: { q?: string; status?: UserStatus; page: number }) {
  return useQuery({
    queryKey: [...ADMIN_KEY, "users", params],
    queryFn: () => api<Paged<AdminUser>>(`/admin/users${queryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useAdminReports(params: { status?: ReportStatus; page: number }) {
  return useQuery({
    queryKey: [...ADMIN_KEY, "reports", params],
    queryFn: () => api<Paged<AdminReport>>(`/admin/reports${queryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useAdminTeams(params: { q?: string; page: number }) {
  return useQuery({
    queryKey: [...ADMIN_KEY, "teams", params],
    queryFn: () => api<Paged<AdminTeam>>(`/admin/teams${queryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

/** Any moderation change can move metrics, user rows and report rows, so refresh all admin data. */
function useAdminMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_KEY }),
  });
}

export function useUpdateUserStatus() {
  return useAdminMutation((input: { userId: string; status: UserStatus; note?: string }) =>
    api(`/admin/users/${encodeURIComponent(input.userId)}/status`, {
      method: "PUT",
      body: { status: input.status, note: input.note },
    }),
  );
}

export function useUpdateReport() {
  return useAdminMutation((input: { reportId: string; status: Exclude<ReportStatus, "PENDING">; action: ReportAction }) =>
    api(`/admin/reports/${encodeURIComponent(input.reportId)}`, {
      method: "PUT",
      body: { status: input.status, action: input.action },
    }),
  );
}

export function useUpdateRecruitment() {
  return useAdminMutation((input: { teamId: string; recruitmentOpen: boolean }) =>
    api(`/admin/teams/${encodeURIComponent(input.teamId)}/recruitment`, {
      method: "PUT",
      body: { recruitmentOpen: input.recruitmentOpen },
    }),
  );
}

export function useTournaments(when: "upcoming" | "past") {
  return useQuery({
    queryKey: [...TOURNAMENTS_KEY, { when }],
    queryFn: async () => (await api<{ events: TournamentEvent[] }>(`/tournaments${queryString({ when })}`)).events,
  });
}

function useTournamentMutation<TInput>(mutationFn: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TOURNAMENTS_KEY }),
  });
}

export function useSaveTournament() {
  return useTournamentMutation((input: { id?: string; values: TournamentInput }) =>
    input.id
      ? api(`/tournaments/${encodeURIComponent(input.id)}`, { method: "PUT", body: input.values })
      : api("/tournaments", { method: "POST", body: input.values }),
  );
}

export function useDeleteTournament() {
  return useTournamentMutation((id: string) => api(`/tournaments/${encodeURIComponent(id)}`, { method: "DELETE" }));
}

export type CoachReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AdminCoach {
  id: string;
  game: "VALORANT" | "LEAGUE_OF_LEGENDS";
  specialties: string[];
  hourlyRate: number;
  bio: string;
  reviewStatus: CoachReviewStatus;
  reviewNote: string | null;
  createdAt: string;
  user: { id: string; displayName: string; email: string };
}

export function useAdminCoaches(status: CoachReviewStatus | null) {
  return useQuery({
    queryKey: [...ADMIN_KEY, "coaches", status],
    queryFn: () => api<AdminCoach[]>(`/admin/coaches${status ? `?status=${status}` : ""}`),
  });
}

export function useReviewCoach() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status: "APPROVED" | "REJECTED"; note?: string }) =>
      api<AdminCoach>(`/admin/coaches/${id}/review`, { method: "PUT", body }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: [...ADMIN_KEY, "coaches"] }),
  });
}

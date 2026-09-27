"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { GameSlug } from "@/lib/contracts";
import type {
  AdminVenue,
  CheckInResult,
  MatchScore,
  OfflineTournament,
  PublicBracket,
  TournamentDetail,
  TournamentEntry,
  TournamentInput,
  TournamentMatch,
  TournamentStatus,
  Venue,
  VenueInput,
  VenueStatus,
} from "./types";

export const OFFLINE_QUERY_KEY = ["offline-tournaments"] as const;
export const VENUE_QUERY_KEY = ["venue"] as const;

const keys = {
  list: (game: GameSlug | null) => [...OFFLINE_QUERY_KEY, "list", game] as const,
  hosted: [...OFFLINE_QUERY_KEY, "hosted"] as const,
  detail: (id: string) => [...OFFLINE_QUERY_KEY, "detail", id] as const,
  bracket: (id: string) => [...OFFLINE_QUERY_KEY, "bracket", id] as const,
  adminVenues: (status: VenueStatus | null) => ["admin", "venues", status] as const,
};

/** Check-in and live brackets refresh on their own so scans and results show up without a reload. */
const LIVE_REFRESH_MS = 15_000;

export type HostStatusChange = Extract<TournamentStatus, "REGISTRATION" | "CHECK_IN" | "CANCELLED">;

export function useOfflineTournaments(game: GameSlug | null) {
  return useQuery({
    queryKey: keys.list(game),
    queryFn: () => api<OfflineTournament[]>(`/offline-tournaments${game ? `?game=${game}` : ""}`),
  });
}

export function useHostedTournaments(enabled: boolean) {
  return useQuery({ enabled, queryKey: keys.hosted, queryFn: () => api<OfflineTournament[]>("/offline-tournaments/hosted") });
}

export function useOfflineTournament(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => api<TournamentDetail>(`/offline-tournaments/${id}`),
    refetchInterval: (query) => {
      const status = query.state.data?.tournament.status;
      return status === "LIVE" || status === "CHECK_IN" ? LIVE_REFRESH_MS : false;
    },
  });
}

/** Venue TV: no sign-in. */
export function usePublicBracket(id: string, refreshMs: number) {
  return useQuery({
    queryKey: keys.bracket(id),
    queryFn: () => api<PublicBracket>(`/public/offline-tournaments/${id}/bracket`, { auth: false }),
    refetchInterval: (query) => (query.state.data?.status === "COMPLETED" ? false : refreshMs),
  });
}

export function useMyVenue() {
  return useQuery({ queryKey: VENUE_QUERY_KEY, queryFn: () => api<{ venue: Venue | null }>("/venues/mine").then((data) => data.venue) });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: OFFLINE_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: VENUE_QUERY_KEY });
  };
}

export function useApplyVenue() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: VenueInput) => api<Venue>("/venues", { method: "POST", body: input }),
    onSettled: invalidate,
  });
}

export function useCreateTournament() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: TournamentInput) => api<OfflineTournament>("/offline-tournaments", { method: "POST", body: input }),
    onSettled: invalidate,
  });
}

export function useSetTournamentStatus(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (status: HostStatusChange) =>
      api<OfflineTournament>(`/offline-tournaments/${id}/status`, { method: "POST", body: { status } }),
    onSettled: invalidate,
  });
}

export function useStartTournament(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => api<TournamentMatch[]>(`/offline-tournaments/${id}/start`, { method: "POST" }),
    onSettled: invalidate,
  });
}

export function useRegisterEntry(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { teamId: string; playerIds: string[] }) =>
      api<TournamentEntry>(`/offline-tournaments/${id}/entries`, { method: "POST", body: input }),
    onSettled: invalidate,
  });
}

export function useWithdrawEntry(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => api<{ success: boolean }>(`/offline-tournaments/${id}/entries/mine`, { method: "DELETE" }),
    onSettled: invalidate,
  });
}

export function useUpdateEntry(tournamentId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ entryId, ...body }: { entryId: string; paid?: boolean; checkedIn?: boolean }) =>
      api<TournamentEntry>(`/offline-tournaments/${tournamentId}/entries/${entryId}`, { method: "PUT", body }),
    onSettled: invalidate,
  });
}

export function useCheckIn() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (code: string) => api<CheckInResult>("/offline-tournaments/check-in", { method: "POST", body: { code } }),
    onSettled: invalidate,
  });
}

/** A captain's report waits for the other captain; the host's result is final. */
export function useSubmitResult() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ matchId, as, ...score }: MatchScore & { matchId: string; as: "captain" | "host" }) =>
      api<TournamentMatch>(`/offline-tournaments/matches/${matchId}/${as === "host" ? "result" : "report"}`, {
        method: "POST",
        body: score,
      }),
    onSettled: invalidate,
  });
}

export function useAdminVenues(status: VenueStatus | null) {
  return useQuery({
    queryKey: keys.adminVenues(status),
    queryFn: () => api<AdminVenue[]>(`/admin/venues${status ? `?status=${status}` : ""}`),
  });
}

export function useReviewVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status: "APPROVED" | "REJECTED"; note?: string }) =>
      api<Venue>(`/admin/venues/${id}/review`, { method: "PUT", body }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["admin", "venues"] }),
  });
}

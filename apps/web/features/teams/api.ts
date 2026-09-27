"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { INBOX_COUNTS_QUERY_KEY } from "@/features/comms/use-inbox-counts";
import { api } from "@/lib/api-client";
import type { GameSlug, PlayMode } from "@/lib/contracts";
import type { LookupOption, RankOption, TeamDetail, TeamInput, TeamSummary } from "./types";

export const TEAMS_QUERY_KEY = ["teams"] as const;
const EVENTS_QUERY_KEY = ["events"] as const;

export const teamKeys = {
  list: (game: GameSlug | null, role: string, mode: PlayMode | null) => [...TEAMS_QUERY_KEY, "list", game, role, mode] as const,
  mine: (game: GameSlug | null) => [...TEAMS_QUERY_KEY, "mine", game] as const,
  detail: (id: string) => [...TEAMS_QUERY_KEY, "detail", id] as const,
};

/** `mode` null lists both ranked and ARAM teams. */
export function useRecruitingTeams(game: GameSlug | null, role: string, mode: PlayMode | null) {
  return useQuery({
    queryKey: teamKeys.list(game, role, mode),
    queryFn: () => {
      const params = new URLSearchParams({ game: game ?? "", recruiting: "true" });
      if (role) params.set("role", role);
      if (mode) params.set("mode", mode);
      return api<{ teams: TeamSummary[] }>(`/teams?${params}`).then((data) => data.teams);
    },
    enabled: game !== null,
  });
}

export function useMyTeams(game: GameSlug | null) {
  return useQuery({
    queryKey: teamKeys.mine(game),
    queryFn: () => api<{ teams: TeamSummary[] }>(`/teams/mine?game=${game}`).then((data) => data.teams),
    enabled: game !== null,
  });
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: teamKeys.detail(id),
    queryFn: () => api<{ team: TeamDetail }>(`/teams/${id}`).then((data) => data.team),
  });
}

/** Refresh team + event queries. `deletedId` skips refetching a team that no longer exists. */
function useInvalidateTeams(deletedId?: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: TEAMS_QUERY_KEY,
        predicate: (query) => !deletedId || query.queryKey[2] !== deletedId,
      }),
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: INBOX_COUNTS_QUERY_KEY }),
    ]);
}

export function useCreateTeam() {
  const invalidate = useInvalidateTeams();
  return useMutation({
    mutationFn: (input: TeamInput) => api<{ team: TeamDetail }>("/teams", { method: "POST", body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateTeam(id: string) {
  const invalidate = useInvalidateTeams();
  return useMutation({
    mutationFn: (input: Partial<Omit<TeamInput, "game">>) =>
      api<{ team: TeamDetail }>(`/teams/${id}`, { method: "PUT", body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteTeam(id: string) {
  const invalidate = useInvalidateTeams(id);
  return useMutation({
    mutationFn: () => api<{ success: true }>(`/teams/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useLeaveTeam(id: string) {
  const invalidate = useInvalidateTeams();
  return useMutation({
    mutationFn: () => api<{ success: true }>(`/teams/${id}/leave`, { method: "POST" }),
    onSuccess: invalidate,
  });
}

export function useRemoveMember(teamId: string) {
  const invalidate = useInvalidateTeams();
  return useMutation({
    mutationFn: (userId: string) => api<{ success: true }>(`/teams/${teamId}/members/${userId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

const LOOKUP_STALE_TIME = 60 * 60 * 1000;

export function useRankOptions(game: GameSlug | null) {
  return useQuery({
    queryKey: ["lookups", "ranks", game],
    queryFn: () => api<{ data: RankOption[] }>(`/lookups/ranks?game=${game}`, { auth: false }).then((res) => res.data),
    enabled: game !== null,
    staleTime: LOOKUP_STALE_TIME,
  });
}

export function useRoleOptions(game: GameSlug | null) {
  return useQuery({
    queryKey: ["lookups", "roles", game],
    queryFn: () => api<{ data: LookupOption[] }>(`/lookups/roles?game=${game}`, { auth: false }).then((res) => res.data),
    enabled: game !== null,
    staleTime: LOOKUP_STALE_TIME,
  });
}

export function useGoalOptions() {
  return useQuery({
    queryKey: ["lookups", "goals"],
    queryFn: () => api<{ data: LookupOption[] }>("/lookups/goals", { auth: false }).then((res) => res.data),
    staleTime: LOOKUP_STALE_TIME,
  });
}

export function useCommStyleOptions() {
  return useQuery({
    queryKey: ["lookups", "communication-styles"],
    queryFn: () => api<{ data: LookupOption[] }>("/lookups/communication-styles", { auth: false }).then((res) => res.data),
    staleTime: LOOKUP_STALE_TIME,
  });
}

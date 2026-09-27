"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { GameSlug } from "@/lib/contracts";
import { SESSION_QUERY_KEY } from "@/lib/session";
import { DASHBOARD_QUERY_KEY } from "@/features/dashboard/api";
import type { LookupOption, MyProfileResponse, PublicProfileResponse, RankOption, UpdateProfileInput } from "./types";

export const PROFILE_QUERY_KEY = ["profile"] as const;

export function useMyProfile(game: GameSlug | null) {
  return useQuery({
    queryKey: [...PROFILE_QUERY_KEY, "me", game],
    queryFn: () => api<MyProfileResponse>(`/profiles/me?game=${game}`),
    enabled: game !== null,
  });
}

export function usePublicProfile(userId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...PROFILE_QUERY_KEY, "public", userId],
    queryFn: () => api<PublicProfileResponse>(`/profiles/${encodeURIComponent(userId)}`),
    enabled,
    retry: false,
  });
}

function useInvalidateProfile() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY }),
      // A new Riot ID resets verification and stats.
      queryClient.invalidateQueries({ queryKey: ["riot"] }),
    ]);
}

export function useUpdateProfile() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api("/profiles/me", { method: "PUT", body: input }),
    onSuccess: invalidate,
  });
}

function useLookup<T>(key: readonly unknown[], path: string, enabled = true) {
  return useQuery({
    queryKey: ["lookups", ...key],
    queryFn: async () => (await api<{ data: T[] }>(path, { auth: false })).data,
    enabled,
    staleTime: Infinity,
  });
}

export function useRankOptions(game: GameSlug) {
  return useLookup<RankOption>(["ranks", game], `/lookups/ranks?game=${game}`);
}

export function useRoleOptions(game: GameSlug) {
  return useLookup<LookupOption>(["roles", game], `/lookups/roles?game=${game}`);
}

export function usePlayModeOptions(game: GameSlug) {
  return useLookup<LookupOption>(["play-modes", game], `/lookups/play-modes?game=${game}`);
}

export function useGoalOptions() {
  return useLookup<LookupOption>(["goals"], "/lookups/goals");
}

export function useStyleOptions() {
  return useLookup<LookupOption>(["communication-styles"], "/lookups/communication-styles");
}

export function useScheduleOptions() {
  return useLookup<LookupOption>(["schedule-slots"], "/lookups/schedule-slots");
}

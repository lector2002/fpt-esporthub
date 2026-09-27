"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { GameSlug } from "@/lib/contracts";
import type { LookupOption, OnboardingInput, OnboardingResponse, PlayModeOption, RankOption } from "./types";

type ListResponse<T> = { data: T[] };

const lookup = <T>(path: string) => api<ListResponse<T>>(`/lookups/${path}`, { auth: false }).then((res) => res.data);

// Lookups are static server data; cache them for the whole visit.
const STATIC = { staleTime: Infinity, gcTime: Infinity } as const;

export function useRanks(game: GameSlug | null) {
  return useQuery({
    queryKey: ["lookups", "ranks", game],
    queryFn: () => lookup<RankOption>(`ranks?game=${game}`),
    enabled: game !== null,
    ...STATIC,
  });
}

export function useRoles(game: GameSlug | null) {
  return useQuery({
    queryKey: ["lookups", "roles", game],
    queryFn: () => lookup<LookupOption>(`roles?game=${game}`),
    enabled: game !== null,
    ...STATIC,
  });
}

export function usePlayModes(game: GameSlug) {
  return useQuery({
    queryKey: ["lookups", "play-modes", game],
    queryFn: () => lookup<PlayModeOption>(`play-modes?game=${game}`),
    ...STATIC,
  });
}

/** Goals, communication styles and schedule slots in one query (none are game-specific). */
export function usePreferenceLookups() {
  return useQuery({
    queryKey: ["lookups", "preferences"],
    queryFn: async () => {
      const [goals, styles, slots] = await Promise.all([
        lookup<LookupOption>("goals"),
        lookup<LookupOption>("communication-styles"),
        lookup<LookupOption>("schedule-slots"),
      ]);
      return { goals, styles, slots };
    },
    ...STATIC,
  });
}

export function useSaveOnboarding() {
  return useMutation({
    mutationFn: (input: OnboardingInput) => api<OnboardingResponse>("/profiles/onboarding", { method: "POST", body: input }),
  });
}

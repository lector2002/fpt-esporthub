"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { GameSlug } from "@/lib/contracts";
import { SESSION_QUERY_KEY, useSession } from "@/lib/session";
import type {
  ConfirmVerificationResponse,
  LinkRiotResponse,
  OwnRiotStatsResponse,
  PublicRiotStatsResponse,
  RiotLookupResponse,
  RiotSuggestion,
  StartVerificationResponse,
} from "./types";

export const RIOT_QUERY_KEY = ["riot"] as const;

const gameQuery = (game: GameSlug) => `?game=${encodeURIComponent(game)}`;

export function useRiotStats(game: GameSlug | null) {
  const { status } = useSession();
  return useQuery({
    queryKey: [...RIOT_QUERY_KEY, "stats", game],
    queryFn: () => api<OwnRiotStatsResponse>(`/riot/stats${gameQuery(game!)}`),
    enabled: status === "authenticated" && !!game,
  });
}

export function usePublicRiotStats(userId: string | undefined, game: GameSlug | null) {
  const { status } = useSession();
  return useQuery({
    queryKey: [...RIOT_QUERY_KEY, "public", userId, game],
    queryFn: () => api<PublicRiotStatsResponse>(`/riot/stats/${encodeURIComponent(userId!)}${gameQuery(game!)}`),
    enabled: status === "authenticated" && !!game && !!userId,
  });
}

/**
 * Linking, verification and sync can change the profile rank and status shown in the session, profile and dashboard.
 * Not awaited: the refetch swaps the panel that called `mutate`, which would drop its onSuccess toast.
 */
function useInvalidateRiot() {
  const queryClient = useQueryClient();
  return () => {
    void Promise.all(
      [RIOT_QUERY_KEY, SESSION_QUERY_KEY, ["profile"], ["dashboard"]].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  };
}

/** Looks up `riotId` once it is set; each lookup spends shared Riot quota, so results are kept for a minute. */
export function useRiotLookup(game: GameSlug, riotId: string | null) {
  return useQuery({
    queryKey: [...RIOT_QUERY_KEY, "lookup", game, riotId],
    queryFn: () => api<RiotLookupResponse>(`/riot/lookup${gameQuery(game)}&riotId=${encodeURIComponent(riotId!)}`),
    enabled: !!riotId,
    retry: false,
    staleTime: 60_000,
  });
}

/** `query` is what the user typed (already debounced); runs once the name part has 3+ characters. */
export function useRiotSuggestions(game: GameSlug, query: string) {
  const name = query.split("#")[0].trim();
  return useQuery({
    queryKey: [...RIOT_QUERY_KEY, "suggest", game, query.trim().toLowerCase()],
    queryFn: () => api<{ suggestions: RiotSuggestion[] }>(`/riot/suggest${gameQuery(game)}&q=${encodeURIComponent(query.trim())}`),
    enabled: game === "league_of_legends" && name.length >= 3,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 60_000,
  });
}

export function useLinkRiot() {
  const invalidate = useInvalidateRiot();
  return useMutation({
    mutationFn: ({ game, riotId }: { game: GameSlug; riotId: string }) =>
      api<LinkRiotResponse>(`/riot/link${gameQuery(game)}`, { method: "POST", body: { riotId } }),
    onSettled: invalidate,
  });
}

export function useUnlinkRiot() {
  const invalidate = useInvalidateRiot();
  return useMutation({
    mutationFn: (game: GameSlug) => api<{ status: "unlinked" }>(`/riot/link${gameQuery(game)}`, { method: "DELETE" }),
    onSettled: invalidate,
  });
}

export function useStartVerification() {
  const invalidate = useInvalidateRiot();
  return useMutation({
    mutationFn: (game: GameSlug) => api<StartVerificationResponse>(`/riot/verify/start${gameQuery(game)}`, { method: "POST" }),
    onSettled: invalidate,
  });
}

export function useConfirmVerification() {
  const invalidate = useInvalidateRiot();
  return useMutation({
    mutationFn: (game: GameSlug) => api<ConfirmVerificationResponse>(`/riot/verify/confirm${gameQuery(game)}`, { method: "POST" }),
    onSettled: invalidate,
  });
}

export function useSyncStats() {
  const invalidate = useInvalidateRiot();
  return useMutation({
    mutationFn: (game: GameSlug) => api<OwnRiotStatsResponse>(`/riot/sync${gameQuery(game)}`, { method: "POST" }),
    onSettled: invalidate,
  });
}

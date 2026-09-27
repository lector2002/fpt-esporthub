"use client";

import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api-client";
import type { GameSlug, PlayMode } from "@/lib/contracts";
import { useActiveGame } from "@/lib/game";
import { useSession } from "@/lib/session";
import type { FindMatchResponse, MatchMode } from "./types";

/** Prefix for every matching query; invalidate `{ queryKey: MATCHING_QUERY_KEY }` after request mutations. */
export const MATCHING_QUERY_KEY = ["matching"] as const;

export function matchingQueryKey(game: GameSlug | null, mode: MatchMode, playMode: PlayMode) {
  return [...MATCHING_QUERY_KEY, game, mode, playMode] as const;
}

/** `playMode` only applies to LoL; the API matches Valorant in ranked. */
export function findMatches(mode: MatchMode, game: GameSlug, playMode: PlayMode) {
  const body = game === "league_of_legends" ? { mode, game, playMode } : { mode, game };
  return api<FindMatchResponse>("/match/find", { method: "POST", body });
}

export function useFindMatches(mode: MatchMode, playMode: PlayMode) {
  const { status } = useSession();
  const { game } = useActiveGame();
  return useQuery({
    queryKey: matchingQueryKey(game, mode, playMode),
    queryFn: () => findMatches(mode, game as GameSlug, playMode),
    enabled: status === "authenticated" && game !== null,
    retry: (count, error) => !(error instanceof ApiError && error.status === 403) && count < 2,
  });
}

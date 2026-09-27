"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getToken } from "@/lib/api-client";
import type { GameSlug } from "@/lib/contracts";
import type { EventDetail, EventSummary, EventWhen } from "./types";

export const EVENTS_QUERY_KEY = ["events"] as const;

export const eventKeys = {
  list: (game: GameSlug | null, when: EventWhen) => [...EVENTS_QUERY_KEY, "list", game, when] as const,
  detail: (id: string) => [...EVENTS_QUERY_KEY, "detail", id] as const,
};

/** Event reads are public; send the token only when there is one so interest state is filled in. */
function readAuth() {
  return { auth: Boolean(getToken()) };
}

/** `game` null lists every game (viewer without a profile). Wait for the session before firing. */
export function useEvents(game: GameSlug | null, when: EventWhen, enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: eventKeys.list(game, when),
    queryFn: () => {
      const params = new URLSearchParams({ when });
      if (game) params.set("game", game);
      return api<{ events: EventSummary[] }>(`/tournaments?${params}`, readAuth()).then((data) => data.events);
    },
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => api<{ event: EventDetail }>(`/tournaments/${id}`, readAuth()).then((data) => data.event),
  });
}

export function useToggleInterest(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (interested: boolean) =>
      api<{ interested: boolean; interestedCount: number }>(`/tournaments/${eventId}/interest`, {
        method: interested ? "POST" : "DELETE",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY }),
  });
}

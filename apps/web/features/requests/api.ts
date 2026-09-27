"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import { INBOX_COUNTS_QUERY_KEY } from "@/features/comms/use-inbox-counts";
import { MATCHING_QUERY_KEY } from "@/features/matching/api";
import type { CreateMatchRequestBody, MatchRequestItem, MatchRequestList, RequestAction } from "./types";

export const MATCH_REQUESTS_QUERY_KEY = ["match-requests"] as const;

/** Everything a request mutation can change: lists, badges, dashboard counts, match card states. */
export function invalidateRequestViews(queryClient: QueryClient) {
  for (const queryKey of [MATCH_REQUESTS_QUERY_KEY, INBOX_COUNTS_QUERY_KEY, MATCHING_QUERY_KEY, ["dashboard"]]) {
    void queryClient.invalidateQueries({ queryKey });
  }
}

export function useMatchRequests() {
  const { status } = useSession();
  return useQuery({
    queryKey: MATCH_REQUESTS_QUERY_KEY,
    queryFn: () => api<MatchRequestList>("/match/requests"),
    enabled: status === "authenticated",
  });
}

export function useCreateMatchRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMatchRequestBody) =>
      api<{ request: MatchRequestItem }>("/match/requests", { method: "POST", body }),
    onSuccess: () => invalidateRequestViews(queryClient),
  });
}

export function useRequestAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: RequestAction }) =>
      api<{ request: MatchRequestItem }>(`/match/requests/${encodeURIComponent(id)}/${action}`, { method: "PUT" }),
    onSuccess: () => invalidateRequestViews(queryClient),
  });
}

/** The open or accepted request between the viewer and a target, if any. */
export function findThread(list: MatchRequestList | undefined, targetType: "player" | "team", targetId: string) {
  if (!list) return null;
  const all = [...list.incoming, ...list.outgoing];
  return (
    all.find((request) => {
      if (request.status !== "PENDING" && request.status !== "ACCEPTED") return false;
      if (request.counterpart.kind !== targetType || request.counterpart.id !== targetId) return false;
      return targetType === "team" || request.type === "PLAYER_TO_PLAYER";
    }) ?? null
  );
}

export function inboxChatHref(conversationId: string | null) {
  return conversationId ? `/inbox?c=${encodeURIComponent(conversationId)}` : "/inbox";
}

export const INBOX_REQUESTS_HREF = "/inbox?tab=requests";

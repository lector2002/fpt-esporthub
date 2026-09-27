"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { GameSlug } from "@/lib/contracts";
import type { CommunityDetail, CommunityInput, CommunitySummary } from "./types";

export const COMMUNITIES_QUERY_KEY = ["communities"] as const;

export const communityKeys = {
  list: (game: GameSlug | null) => [...COMMUNITIES_QUERY_KEY, "list", game] as const,
  mine: () => [...COMMUNITIES_QUERY_KEY, "mine"] as const,
  detail: (id: string) => [...COMMUNITIES_QUERY_KEY, "detail", id] as const,
};

/** Member online dots and "in voice" counts have no push event; a slow poll keeps them fresh. */
const PRESENCE_REFRESH_MS = 30_000;

export const communityHref = (id: string, channelId?: string) =>
  `/communities/${encodeURIComponent(id)}${channelId ? `?channel=${encodeURIComponent(channelId)}` : ""}`;

/** `game` null lists every community; a game keeps the ones open to all games too. */
export function useCommunities(game: GameSlug | null) {
  return useQuery({
    queryKey: communityKeys.list(game),
    queryFn: () =>
      api<{ communities: CommunitySummary[] }>(`/communities${game ? `?game=${game}` : ""}`).then((data) => data.communities),
  });
}

export function useMyCommunities() {
  return useQuery({
    queryKey: communityKeys.mine(),
    queryFn: () => api<{ communities: CommunitySummary[] }>("/communities/mine").then((data) => data.communities),
    refetchInterval: PRESENCE_REFRESH_MS,
  });
}

export function useCommunity(id: string) {
  return useQuery({
    queryKey: communityKeys.detail(id),
    queryFn: () => api<{ community: CommunityDetail }>(`/communities/${encodeURIComponent(id)}`).then((data) => data.community),
    refetchInterval: PRESENCE_REFRESH_MS,
  });
}

/** Every mutation answers with the fresh detail (except delete/leave); lists refetch around it. */
function useCommunityMutation<T>(request: (input: T) => Promise<{ community?: CommunityDetail }>, deletedId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (data) => {
      if (data.community) queryClient.setQueryData(communityKeys.detail(data.community.id), data.community);
      return queryClient.invalidateQueries({
        queryKey: COMMUNITIES_QUERY_KEY,
        predicate: (query) => !deletedId || query.queryKey[2] !== deletedId,
      });
    },
  });
}

const path = (id: string) => `/communities/${encodeURIComponent(id)}`;

export function useCreateCommunity() {
  return useCommunityMutation((input: CommunityInput) => api<{ community: CommunityDetail }>("/communities", { method: "POST", body: input }));
}

export function useUpdateCommunity(id: string) {
  return useCommunityMutation((input: Partial<CommunityInput>) => api<{ community: CommunityDetail }>(path(id), { method: "PUT", body: input }));
}

export function useDeleteCommunity(id: string) {
  return useCommunityMutation(() => api<{ community?: undefined }>(path(id), { method: "DELETE" }), id);
}

export function useJoinCommunity() {
  return useCommunityMutation((id: string) => api<{ community: CommunityDetail }>(`${path(id)}/join`, { method: "POST" }));
}

export function useLeaveCommunity(id: string) {
  return useCommunityMutation(() => api<{ community?: undefined }>(`${path(id)}/leave`, { method: "POST" }));
}

export function useAddChannel(id: string) {
  return useCommunityMutation((input: { name: string; kind: "text" | "voice" }) =>
    api<{ community: CommunityDetail }>(`${path(id)}/channels`, { method: "POST", body: input }),
  );
}

export function useRemoveChannel(id: string) {
  return useCommunityMutation((channelId: string) =>
    api<{ community: CommunityDetail }>(`${path(id)}/channels/${encodeURIComponent(channelId)}`, { method: "DELETE" }),
  );
}

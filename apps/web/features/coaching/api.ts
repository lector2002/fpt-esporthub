"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { GameSlug } from "@/lib/contracts";
import { WALLET_KEY } from "@/features/credits/api";
import type { CoachDetail, CoachProfileInput, CoachReview, CoachSummary, MyCoachProfile, CoachingRequest, CoachingRequests, ProposalInput } from "./types";

export const COACHING_KEYS = {
  all: ["coaching"] as const,
  coaches: (game: GameSlug | null) => ["coaching", "coaches", game] as const,
  coach: (id: string) => ["coaching", "coach", id] as const,
  mine: ["coaching", "mine"] as const,
  requests: ["coaching", "requests"] as const,
};

export function useCoaches(game: GameSlug | null) {
  return useQuery({
    queryKey: COACHING_KEYS.coaches(game),
    queryFn: () => api<{ coaches: CoachSummary[] }>(`/coaching/coaches?game=${game}`).then((data) => data.coaches),
    enabled: game !== null,
  });
}

export function useCoach(id: string) {
  return useQuery({
    queryKey: COACHING_KEYS.coach(id),
    queryFn: () => api<CoachDetail>(`/coaching/coaches/${encodeURIComponent(id)}`),
  });
}

/** The caller's coach profile, or null when they have not created one. */
export function useMyCoachProfile() {
  return useQuery({
    queryKey: COACHING_KEYS.mine,
    queryFn: async (): Promise<MyCoachProfile | null> => {
      const { coach, review } = await api<{ coach: CoachSummary | null; review: { note: string | null } | null }>("/coaching/coaches/me");
      return coach ? { ...coach, reviewNote: review?.note ?? null } : null;
    },
  });
}

export function useCoachingRequests() {
  return useQuery({
    queryKey: COACHING_KEYS.requests,
    queryFn: () => api<CoachingRequests>("/coaching/requests"),
  });
}

/** Every coaching mutation touches listings, stats or requests, so refresh the whole feature; agreeing or cancelling also moves escrowed credits. */
function useCoachingMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([queryClient.invalidateQueries({ queryKey: COACHING_KEYS.all }), queryClient.invalidateQueries({ queryKey: WALLET_KEY })]),
  });
}

export function useCreateCoachingRequest() {
  return useCoachingMutation((input: ProposalInput & { coachId: string }) =>
    api<{ request: CoachingRequest }>("/coaching/requests", { method: "POST", body: input }),
  );
}

export function useCounterCoachingRequest() {
  return useCoachingMutation(({ id, ...input }: ProposalInput & { id: string }) =>
    api<{ request: CoachingRequest }>(`/coaching/requests/${id}/counter`, { method: "PUT", body: input }),
  );
}

export type RequestAction = "agree" | "decline" | "cancel" | "confirm" | "dispute";

export function useCoachingRequestAction() {
  return useCoachingMutation(({ id, action }: { id: string; action: RequestAction }) =>
    api<{ request: CoachingRequest }>(`/coaching/requests/${id}/${action}`, { method: "PUT" }),
  );
}

export function useSaveCoachProfile() {
  return useCoachingMutation((input: CoachProfileInput) =>
    api<{ coach: CoachSummary }>("/coaching/coaches/me", { method: "POST", body: input }),
  );
}

export function useSetCoachActive() {
  return useCoachingMutation((active: boolean) =>
    api<{ coach: CoachSummary }>("/coaching/coaches/me/active", { method: "PUT", body: { active } }),
  );
}

export function useCreateCoachReview(coachId: string) {
  return useCoachingMutation((input: { rating: number; comment: string }) =>
    api<{ review: CoachReview }>(`/coaching/coaches/${encodeURIComponent(coachId)}/feedback`, { method: "POST", body: input }),
  );
}

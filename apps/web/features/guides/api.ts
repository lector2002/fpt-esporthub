"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { GuideDetail, GuideSummary, PremiumStatus } from "./types";

export function useGuides() {
  return useQuery({ queryKey: ["guides", "list"], queryFn: async () => (await api<{ guides: GuideSummary[] }>("/guides")).guides });
}

export function useGuide(champion: string, position: string) {
  return useQuery({
    queryKey: ["guides", "detail", champion, position],
    queryFn: () => api<GuideDetail>(`/guides/${encodeURIComponent(champion)}/${encodeURIComponent(position)}`),
    retry: false,
  });
}

export function usePremium() {
  return useQuery({ queryKey: ["guides", "premium"], queryFn: () => api<PremiumStatus>("/guides/premium") });
}

export function useBuyPremium() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ premiumUntil: string; balance: number }>("/guides/premium", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

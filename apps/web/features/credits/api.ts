"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { GameSlug } from "@/lib/contracts";
import { useSession } from "@/lib/session";
import type { AdminCreditTransaction, CheckIn, CoachingPayments, TopUp, Wallet } from "./types";

export const WALLET_KEY = ["credits"] as const;

export function useWallet() {
  const { status } = useSession();
  return useQuery({
    queryKey: [...WALLET_KEY, "me"],
    queryFn: () => api<Wallet>("/credits/me"),
    enabled: status === "authenticated",
  });
}

export function useCreateTopUp() {
  return useMutation({
    mutationFn: (credits: number) => api<{ topUp: TopUp }>("/credits/topups", { method: "POST", body: { credits } }),
  });
}

/** Polls while pending: the webhook (or payOS itself, asked by the API) settles it. */
export function useTopUp(orderCode: number | null) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...WALLET_KEY, "topup", orderCode],
    queryFn: async () => {
      const { topUp } = await api<{ topUp: TopUp }>(`/credits/topups/${orderCode}`);
      if (topUp.status !== "PENDING") void queryClient.invalidateQueries({ queryKey: [...WALLET_KEY, "me"] });
      // A first top-up also gives a pet.
      if (topUp.status === "PAID") void queryClient.invalidateQueries({ queryKey: ["cosmetics"] });
      return topUp;
    },
    enabled: orderCode !== null,
    retry: false,
    refetchInterval: (query) => (query.state.data?.status === "PENDING" ? 3000 : false),
  });
}

function useWalletMutation<T, V>(fn: (vars: V) => Promise<T>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries() });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<CheckIn>("/credits/check-in", { method: "POST" }),
    onSuccess: (result) => {
      if (result.claimed) void queryClient.invalidateQueries({ queryKey: WALLET_KEY });
    },
  });
}

export function useMockCheckout() {
  return useWalletMutation(({ orderCode, action }: { orderCode: number; action: "pay" | "cancel" }) =>
    api<{ topUp: TopUp }>(`/credits/topups/${orderCode}/mock-${action}`, { method: "POST" }),
  );
}

export function useBoostProfile() {
  return useWalletMutation((game: GameSlug) => api<{ boostedUntil: string; balance: number }>("/credits/promotions/boost", { method: "POST", body: { game } }));
}

export function useFeatureTeam(teamId: string) {
  return useWalletMutation(() => api<{ featuredUntil: string; balance: number }>(`/credits/promotions/teams/${teamId}/feature`, { method: "POST" }));
}

export function useAdminCredits(userId: string) {
  return useQuery({
    queryKey: [...WALLET_KEY, "admin", userId],
    queryFn: async () => (await api<{ transactions: AdminCreditTransaction[] }>(`/admin/credits${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`)).transactions,
  });
}

export function useAdjustCredits() {
  return useWalletMutation((body: { userId: string; amount: number; note: string }) => api("/admin/credits/adjust", { method: "POST", body }));
}

export function useCoachingPayments() {
  return useQuery({ queryKey: [...WALLET_KEY, "admin", "coaching"], queryFn: () => api<CoachingPayments>("/admin/coaching/payments") });
}

export function useResolveDispute() {
  return useWalletMutation(({ id, outcome }: { id: string; outcome: "release" | "refund" }) =>
    api(`/admin/coaching/requests/${id}/resolve`, { method: "POST", body: { outcome } }),
  );
}

export function useRecordPayout() {
  return useWalletMutation(({ coachId, amount, note }: { coachId: string; amount: number; note: string }) =>
    api(`/admin/coaching/coaches/${coachId}/payouts`, { method: "POST", body: { amount, note } }),
  );
}

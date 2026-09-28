"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CosmeticKind, CosmeticsView } from "@/lib/contracts";

export type Rarity = "common" | "rare" | "epic";

export interface CosmeticItem {
  id: string;
  kind: CosmeticKind;
  credits: number;
  rarity: Rarity;
}

/** GET /cosmetics/me */
export interface CosmeticsShop {
  catalog: CosmeticItem[];
  owned: string[];
  equipped: CosmeticsView;
  balance: number;
  /** `rates` in percent over the items this player doesn't own yet. */
  gacha: { price: number; remaining: number; rates: Record<Rarity, number> };
}

export function useCosmetics() {
  return useQuery({ queryKey: ["cosmetics", "me"], queryFn: () => api<CosmeticsShop>("/cosmetics/me") });
}

/** Buying and equipping change the profile, cards and wallet, so everything refetches. */
function useShopMutation<V, R>(fn: (vars: V) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries() });
}

export function useBuyCosmetic() {
  return useShopMutation((itemId: string) => api<CosmeticsShop>(`/cosmetics/${itemId}/buy`, { method: "POST" }));
}

export function useEquipCosmetic() {
  return useShopMutation((body: { kind: CosmeticKind; itemId: string | null }) => api<CosmeticsShop>("/cosmetics/equipped", { method: "PUT", body }));
}

export function usePullGacha() {
  return useShopMutation(() => api<{ item: CosmeticItem; shop: CosmeticsShop }>("/cosmetics/gacha/pull", { method: "POST" }));
}

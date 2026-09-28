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
  /** Only drops from its own limited gacha banner; never sold. */
  limited?: true;
}

/** `rates` in percent over what this banner can still give this player; `limited` is the featured item's share. */
export interface GachaBanner {
  id: string;
  featured: string | null;
  remaining: number;
  rates: Record<Rarity | "limited", number>;
}

/** GET /cosmetics/me */
export interface CosmeticsShop {
  catalog: CosmeticItem[];
  owned: string[];
  equipped: CosmeticsView;
  balance: number;
  /** `batch` opens at once for `price` each, rare or better guaranteed. The first banner is the standard box. */
  gacha: { price: number; batch: number; banners: GachaBanner[] };
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
  return useShopMutation((body: { banner: string; count: number }) => api<{ items: CosmeticItem[]; shop: CosmeticsShop }>("/cosmetics/gacha/pull", { method: "POST", body }));
}

"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/common/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePromotionError } from "@/features/credits/components/promotions";
import { SpendButton } from "@/features/credits/components/spend-button";
import type { CosmeticKind, CosmeticsView } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { type CosmeticItem, type Rarity, useBuyCosmetic, useEquipCosmetic } from "../api";
import { RARITY_LOOK } from "../looks";
import { type CosmeticsMessageKey, useCosmeticsMessages } from "../messages";
import { CosmeticBanner, CosmeticFrame, CosmeticPet, CosmeticTitle, RarityBadge, cardLookClass, nameColorClass } from "./cosmetic-parts";

export const KINDS: CosmeticKind[] = ["pet", "frame", "banner", "nameColor", "title", "card"];

const RARITY_RANK: Record<Rarity, number> = { epic: 0, rare: 1, common: 2 };

/** Epic first, then rare, then common. */
export const byRarity = (a: CosmeticItem, b: CosmeticItem) => RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity];

export function ShopItem({ item, owned, equipped, name, avatarKey }: { item: CosmeticItem; owned: boolean; equipped: CosmeticsView; name: string; avatarKey: string | null }) {
  const { t } = useCosmeticsMessages();
  const buy = useBuyCosmetic();
  const equip = useEquipCosmetic();
  const onSpendError = usePromotionError();
  const inUse = equipped[item.kind] === item.id;
  const label = t(item.id as CosmeticsMessageKey);
  const pending = buy.isPending || equip.isPending;

  const setEquipped = (itemId: string | null) => equip.mutate({ kind: item.kind, itemId }, { onError: (error) => toast.error(error.message) });

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-lg border border-border bg-card", RARITY_LOOK[item.rarity].tile, inUse && "border-primary")} data-cosmetic={item.id}>
      <CosmeticPreview item={item} name={name} avatarKey={avatarKey} />
      <div className="flex items-center gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{label}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <RarityBadge rarity={item.rarity} />
            {inUse && (
              <Badge variant="secondary">
                <Check /> {t("equipped")}
              </Badge>
            )}
          </div>
        </div>
        {!owned ? (
          <SpendButton
            price={item.credits}
            label={t("buy")}
            confirmTitle={t("buyConfirmTitle", { name: label })}
            pending={pending}
            size="sm"
            onConfirm={() => buy.mutate(item.id, { onSuccess: () => toast.success(t("bought")), onError: onSpendError })}
          />
        ) : inUse ? (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setEquipped(null)}>
            {t("unequip")}
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setEquipped(item.id)}>
            {t("equip")}
          </Button>
        )}
      </div>
    </div>
  );
}

/** The item worn by the viewer: avatar, name and title, or a banner strip. */
export function CosmeticPreview({ item, name, avatarKey, className }: { item: CosmeticItem; name: string; avatarKey: string | null; className?: string }) {
  if (item.kind === "banner") return <CosmeticBanner banner={item.id} className={cn("h-16", className)} />;
  if (item.kind === "pet") {
    return (
      <div className={cn("flex h-16 items-end justify-center", RARITY_LOOK[item.rarity].wash, className)}>
        <CosmeticPet pet={item.id} className="h-15" />
      </div>
    );
  }
  const identity = (
    <>
      <CosmeticFrame frame={item.kind === "frame" ? item.id : null}>
        <UserAvatar name={name} imageKey={avatarKey} className="size-9" />
      </CosmeticFrame>
      <div className="flex min-w-0 flex-col">
        <span className={cn("truncate text-sm font-semibold", item.kind === "nameColor" && nameColorClass(item.id))}>{name}</span>
        {item.kind === "title" && <CosmeticTitle title={item.id} />}
      </div>
    </>
  );
  if (item.kind === "card") {
    return (
      <div className={cn("flex h-16 items-center px-3", RARITY_LOOK[item.rarity].wash, className)}>
        <div className={cn("flex h-11 w-full items-center gap-3 rounded-md bg-card px-2", cardLookClass(item.id))}>{identity}</div>
      </div>
    );
  }
  return <div className={cn("flex h-16 items-center gap-3 px-3", RARITY_LOOK[item.rarity].wash, className)}>{identity}</div>;
}

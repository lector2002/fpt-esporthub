"use client";

import Link from "next/link";
import { Check, Coins } from "lucide-react";
import { toast } from "sonner";
import { QueryState } from "@/components/common/query-state";
import { UserAvatar } from "@/components/common/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePromotionError } from "@/features/credits/components/promotions";
import { SpendButton } from "@/features/credits/components/spend-button";
import { useCreditsMessages } from "@/features/credits/messages";
import type { CosmeticKind, CosmeticsView } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { type CosmeticItem, useBuyCosmetic, useCosmetics, useEquipCosmetic } from "../api";
import { type CosmeticsMessageKey, useCosmeticsMessages } from "../messages";
import { CosmeticBanner, CosmeticFrame, CosmeticTitle, nameColorClass } from "./cosmetic-parts";

const KINDS: CosmeticKind[] = ["frame", "banner", "nameColor", "title"];

export function CosmeticsShop({ name, avatarKey }: { name: string; avatarKey: string | null }) {
  const { t } = useCosmeticsMessages();
  const credits = useCreditsMessages().t;
  const shop = useCosmetics();

  return (
    <QueryState query={shop}>
      {(data) => (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{t("hint")}</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/wallet">
                <Coins /> {credits("credits", { count: data.balance })}
              </Link>
            </Button>
          </div>
          <Tabs defaultValue="frame">
            <TabsList className="flex-wrap">
              {KINDS.map((kind) => (
                <TabsTrigger key={kind} value={kind}>
                  {t(`kind_${kind}`)}
                </TabsTrigger>
              ))}
            </TabsList>
            {KINDS.map((kind) => (
              <TabsContent key={kind} value={kind} className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.catalog
                  .filter((item) => item.kind === kind)
                  .map((item) => (
                    <ShopItem key={item.id} item={item} owned={data.owned.includes(item.id)} equipped={data.equipped} name={name} avatarKey={avatarKey} />
                  ))}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </QueryState>
  );
}

const SLOT: Record<CosmeticKind, keyof CosmeticsView> = { frame: "frame", banner: "banner", nameColor: "nameColor", title: "title" };

function ShopItem({ item, owned, equipped, name, avatarKey }: { item: CosmeticItem; owned: boolean; equipped: CosmeticsView; name: string; avatarKey: string | null }) {
  const { t } = useCosmeticsMessages();
  const buy = useBuyCosmetic();
  const equip = useEquipCosmetic();
  const onSpendError = usePromotionError();
  const inUse = equipped[SLOT[item.kind]] === item.id;
  const label = t(item.id as CosmeticsMessageKey);
  const pending = buy.isPending || equip.isPending;

  const setEquipped = (itemId: string | null) => equip.mutate({ kind: item.kind, itemId }, { onError: (error) => toast.error(error.message) });

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-lg border border-border", inUse && "border-primary")} data-cosmetic={item.id}>
      <Preview item={item} name={name} avatarKey={avatarKey} />
      <div className="flex items-center gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{label}</p>
          {inUse && (
            <Badge variant="secondary" className="mt-1">
              <Check /> {t("equipped")}
            </Badge>
          )}
        </div>
        {!owned ? (
          <SpendButton
            price={item.credits}
            label={t("buy")}
            confirmTitle={t("buyConfirmTitle", { name: label })}
            pending={pending}
            variant="outline"
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

function Preview({ item, name, avatarKey }: { item: CosmeticItem; name: string; avatarKey: string | null }) {
  if (item.kind === "banner") return <CosmeticBanner banner={item.id} className="h-16" />;
  return (
    <div className="flex h-16 items-center gap-3 bg-muted/40 px-3">
      {item.kind === "frame" ? (
        <CosmeticFrame frame={item.id}>
          <UserAvatar name={name} imageKey={avatarKey} className="size-9" />
        </CosmeticFrame>
      ) : (
        <UserAvatar name={name} imageKey={avatarKey} className="size-9" />
      )}
      <div className="flex min-w-0 flex-col">
        <span className={cn("truncate text-sm font-semibold", item.kind === "nameColor" && nameColorClass(item.id))}>{name}</span>
        {item.kind === "title" && <CosmeticTitle title={item.id} />}
      </div>
    </div>
  );
}

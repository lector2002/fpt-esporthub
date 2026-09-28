"use client";

import Link from "next/link";
import { Coins } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ListSkeleton, QueryState } from "@/components/common/query-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COIN_OUTLINE } from "@/features/credits/components/spend-button";
import { useCreditsMessages } from "@/features/credits/messages";
import type { CosmeticKind } from "@/lib/contracts";
import { useSession } from "@/lib/session";
import { type CosmeticsShop, useCosmetics } from "../api";
import { useCosmeticsMessages } from "../messages";
import { GachaBox } from "./gacha-box";
import { KINDS, ShopItem, byRarity } from "./shop-item";

/** /shop: mystery box on top, then every item by kind. Owned items show Use instead of a price. */
export function ShopScreen() {
  const { t } = useCosmeticsMessages();
  const credits = useCreditsMessages().t;
  const shop = useCosmetics();
  const user = useSession().user;
  const name = user?.displayName ?? "";
  const avatarKey = user?.avatarKey ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("shopTitle")}
        actions={
          shop.data && (
            <Button asChild size="sm" variant="outline" className={COIN_OUTLINE}>
              <Link href="/wallet">
                <Coins /> {credits("credits", { count: shop.data.balance })}
              </Link>
            </Button>
          )
        }
      />
      <QueryState query={shop} skeleton={<ListSkeleton rows={4} />}>
        {(data) => (
          <>
            <GachaBox shop={data} name={name} avatarKey={avatarKey} />
            <Tabs defaultValue="all" className="gap-4">
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <TabsList className="w-max">
                  <TabsTrigger value="all">{t("shopAll")}</TabsTrigger>
                  {KINDS.map((kind) => (
                    <TabsTrigger key={kind} value={kind}>
                      {t(`kind_${kind}`)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <TabsContent value="all" className="flex flex-col gap-6">
                {KINDS.map((kind) => (
                  <KindSection key={kind} kind={kind} shop={data} name={name} avatarKey={avatarKey} />
                ))}
              </TabsContent>
              {KINDS.map((kind) => (
                <TabsContent key={kind} value={kind}>
                  <KindSection kind={kind} shop={data} name={name} avatarKey={avatarKey} />
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}
      </QueryState>
    </div>
  );
}

function KindSection({ kind, shop, name, avatarKey }: { kind: CosmeticKind; shop: CosmeticsShop; name: string; avatarKey: string | null }) {
  const { t } = useCosmeticsMessages();
  const items = shop.catalog.filter((item) => item.kind === kind).sort(byRarity);
  const owned = items.filter((item) => shop.owned.includes(item.id)).length;

  return (
    <section className="flex flex-col gap-3" aria-label={t(`kind_${kind}`)}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{t(`kind_${kind}`)}</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{t("ownedCount", { owned, total: items.length })}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {items.map((item) => (
          <ShopItem key={item.id} item={item} owned={shop.owned.includes(item.id)} equipped={shop.equipped} name={name} avatarKey={avatarKey} />
        ))}
      </div>
    </section>
  );
}

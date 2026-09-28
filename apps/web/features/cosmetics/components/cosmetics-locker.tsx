"use client";

import Link from "next/link";
import { Sparkles, Store } from "lucide-react";
import { EmptyState, QueryState } from "@/components/common/query-state";
import { Button } from "@/components/ui/button";
import { useCosmetics } from "../api";
import { useCosmeticsMessages } from "../messages";
import { KINDS, ShopItem, byRarity } from "./shop-item";

/** Profile › Decorations: only what the player owns, to equip or take off. Buying lives in /shop. */
export function CosmeticsLocker({ name, avatarKey }: { name: string; avatarKey: string | null }) {
  const { t } = useCosmeticsMessages();
  const shop = useCosmetics();
  const shopLink = (
    <Button asChild variant="outline" size="sm">
      <Link href="/shop">
        <Store /> {t("openShop")}
      </Link>
    </Button>
  );

  return (
    <QueryState query={shop}>
      {(data) => {
        const owned = data.catalog.filter((item) => data.owned.includes(item.id));
        if (owned.length === 0) return <EmptyState icon={Sparkles} title={t("lockerEmpty")} action={shopLink} />;
        return (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{t("lockerHint")}</p>
              {shopLink}
            </div>
            {KINDS.map((kind) => {
              const items = owned.filter((item) => item.kind === kind).sort(byRarity);
              return (
                <section key={kind} className="flex flex-col gap-2" aria-label={t(`kind_${kind}`)}>
                  <h3 className="text-sm font-medium">{t(`kind_${kind}`)}</h3>
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("lockerKindEmpty")}</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map((item) => (
                        <ShopItem key={item.id} item={item} owned equipped={data.equipped} name={name} avatarKey={avatarKey} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        );
      }}
    </QueryState>
  );
}

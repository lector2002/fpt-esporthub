"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/features/credits/api";
import { COIN_OUTLINE } from "@/features/credits/components/spend-button";
import { cn } from "@/lib/utils";
import { useShellMessages } from "@/features/shell/messages";

/** Current credit balance in the top bar, gold like every credit action; opens the wallet to top up. */
export function CreditBalance() {
  const { t } = useShellMessages();
  const pathname = usePathname();
  const balance = useWallet().data?.balance;

  return (
    <Button asChild variant="outline" size="sm" className={cn("h-9 gap-1.5 rounded-full pr-1.5 pl-3 text-sm font-semibold tabular-nums [&_svg]:size-4", COIN_OUTLINE)}>
      <Link
        href="/wallet"
        aria-label={balance === undefined ? t("wallet") : t("balanceLabel", { count: balance })}
        aria-current={pathname === "/wallet" ? "page" : undefined}
        data-testid="topbar-balance"
      >
        <Coins aria-hidden />
        {balance === undefined ? <Skeleton className="h-3 w-6" /> : balance}
        <span className="flex size-6 items-center justify-center rounded-full bg-coin text-coin-foreground [&_svg]:size-3.5" aria-hidden>
          <Plus />
        </span>
      </Link>
    </Button>
  );
}

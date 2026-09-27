"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/features/credits/api";
import { useShellMessages } from "@/features/shell/messages";

/** Current credit balance in the top bar; opens the wallet. */
export function CreditBalance() {
  const { t } = useShellMessages();
  const pathname = usePathname();
  const balance = useWallet().data?.balance;

  return (
    <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 rounded-full px-3.5 text-sm font-semibold tabular-nums [&_svg]:size-4">
      <Link
        href="/wallet"
        aria-label={balance === undefined ? t("wallet") : t("balanceLabel", { count: balance })}
        aria-current={pathname === "/wallet" ? "page" : undefined}
        data-testid="topbar-balance"
      >
        <Coins className="text-coin" aria-hidden />
        {balance === undefined ? <Skeleton className="h-3 w-6" /> : balance}
      </Link>
    </Button>
  );
}

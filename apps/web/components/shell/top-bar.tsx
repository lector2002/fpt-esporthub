"use client";

import Link from "next/link";
import { useShellMessages } from "@/features/shell/messages";
import type { SessionUser } from "@/lib/contracts";
import { BrandMark } from "./brand-mark";
import { CreditBalance } from "./credit-balance";
import { GameSwitcher } from "./game-switcher";
import { InboxButton } from "./inbox-button";
import { UserMenu } from "./user-menu";

export function TopBar({ user }: { user: SessionUser }) {
  const { t } = useShellMessages();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-background px-4 md:px-6">
      <Link href="/dashboard" aria-label={t("brand")} className="shrink-0 md:hidden">
        <BrandMark />
      </Link>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        <GameSwitcher />
        <CreditBalance />
        <InboxButton />
        <UserMenu user={user} />
      </div>
    </header>
  );
}

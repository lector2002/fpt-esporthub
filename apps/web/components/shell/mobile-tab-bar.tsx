"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShellMessages } from "@/features/shell/messages";
import { NAV_ITEMS, isNavActive } from "@/features/shell/nav-items";
import { cn } from "@/lib/utils";

const TAB_ITEMS = NAV_ITEMS.filter((item) => item.tab);

export function MobileTabBar() {
  const { t } = useShellMessages();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("navigation")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {TAB_ITEMS.map((item) => {
          const active = isNavActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors focus-visible:text-foreground focus-visible:outline-none",
                  active && "text-primary",
                )}
              >
                <item.icon className="size-5" />
                <span className="max-w-full truncate px-1">{t(item.shortKey ?? item.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

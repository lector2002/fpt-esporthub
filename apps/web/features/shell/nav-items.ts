import { BookOpen, Crosshair, GraduationCap, LayoutDashboard, MessagesSquare, ShieldCheck, Store, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ShellMessageKey } from "./messages";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  labelKey: ShellMessageKey;
  /** Shorter label for the mobile tab bar. */
  shortKey?: ShellMessageKey;
  /** Shown in the mobile bottom tab bar; otherwise reachable from the user menu on mobile. */
  tab: boolean;
  adminOnly?: boolean;
  /** Other route prefixes that belong to this item. */
  also?: string[];
}

// Wallet, inbox and the account menu sit at the right of the top bar.
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "home", tab: true },
  { href: "/find-match", icon: Crosshair, labelKey: "findMatch", tab: true },
  { href: "/teams", icon: Users, labelKey: "teams", tab: true },
  { href: "/communities", icon: MessagesSquare, labelKey: "communities", shortKey: "communitiesShort", tab: true },
  // Online events and offline cafe cups share one hub; cup detail pages stay under /tournaments.
  { href: "/events", icon: Trophy, labelKey: "events", tab: true, also: ["/tournaments"] },
  { href: "/coaches", icon: GraduationCap, labelKey: "coaching", tab: false },
  { href: "/shop", icon: Store, labelKey: "shop", tab: false },
  { href: "/guides", icon: BookOpen, labelKey: "guides", tab: false },
  { href: "/admin", icon: ShieldCheck, labelKey: "admin", tab: false, adminOnly: true },
];

export function visibleNavItems(isAdmin: boolean) {
  return NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
}

export function isNavActive(pathname: string, item: Pick<NavItem, "href" | "also">) {
  return [item.href, ...(item.also ?? [])].some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

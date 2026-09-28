import { Activity, Building2, CircleDollarSign, Coins, Flag, GraduationCap, Medal, MessagesSquare, Shield, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { useAdminMessages } from "./messages";

type AdminMessageKey = Parameters<ReturnType<typeof useAdminMessages>["t"]>[0];

export interface AdminNavItem {
  /** `null` is the console home, `/admin`. */
  section: AdminSectionKey | null;
  icon: LucideIcon;
  labelKey: AdminMessageKey;
}

export const ADMIN_NAV: { labelKey: AdminMessageKey; items: AdminNavItem[] }[] = [
  {
    labelKey: "groupFinance",
    items: [
      { section: null, icon: CircleDollarSign, labelKey: "tabFinance" },
      { section: "credits", icon: Coins, labelKey: "tabCredits" },
    ],
  },
  {
    labelKey: "groupCommunity",
    items: [
      { section: "overview", icon: Activity, labelKey: "tabOverview" },
      { section: "users", icon: Users, labelKey: "tabUsers" },
      { section: "reports", icon: Flag, labelKey: "tabReports" },
      { section: "teams", icon: Shield, labelKey: "tabTeams" },
      { section: "communities", icon: MessagesSquare, labelKey: "tabCommunities" },
    ],
  },
  {
    labelKey: "groupContent",
    items: [
      { section: "events", icon: Trophy, labelKey: "tabEvents" },
      { section: "cups", icon: Medal, labelKey: "tabCups" },
      { section: "venues", icon: Building2, labelKey: "tabVenues" },
      { section: "coaches", icon: GraduationCap, labelKey: "tabCoaches" },
    ],
  },
];

export const adminHref = (section: string | null) => (section ? `/admin/${section}` : "/admin");

export const ADMIN_SECTIONS = ADMIN_NAV.flatMap((group) => group.items);

export type AdminSectionKey = "credits" | "overview" | "users" | "reports" | "teams" | "communities" | "events" | "cups" | "venues" | "coaches";

export const isAdminSection = (value: string): value is AdminSectionKey => ADMIN_SECTIONS.some((item) => item.section === value);

/** Sections whose rows open `/admin/<section>/<id>`. Server-safe: the detail route validates against it. */
const DETAIL_SECTIONS: readonly AdminSectionKey[] = ["users", "teams", "events", "cups", "venues", "coaches", "communities"];

export const hasAdminDetail = (section: AdminSectionKey) => DETAIL_SECTIONS.includes(section);

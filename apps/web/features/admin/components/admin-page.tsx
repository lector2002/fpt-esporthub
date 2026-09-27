"use client";

import { ShieldX } from "lucide-react";
import { EmptyState, ListSkeleton } from "@/components/common/query-state";
import { PageHeader } from "@/components/common/page-header";
import { useSession } from "@/lib/session";
import { useAdminMessages } from "../messages";
import { ADMIN_SECTIONS, type AdminSectionKey } from "../nav";
import { EventsTab } from "./events-tab";
import { FinancePage } from "./finance-page";
import { OverviewTab } from "./overview-tab";
import { ReportsTab } from "./reports-tab";
import { TeamsTab } from "./teams-tab";
import { UsersTab } from "./users-tab";
import { VenuesTab } from "./venues-tab";
import { CoachesTab } from "./coaches-tab";
import { AdminCreditsTab } from "@/features/credits/components/admin-credits-tab";

const SECTIONS = {
  credits: AdminCreditsTab,
  overview: OverviewTab,
  users: UsersTab,
  reports: ReportsTab,
  teams: TeamsTab,
  events: EventsTab,
  venues: VenuesTab,
  coaches: CoachesTab,
} satisfies Record<AdminSectionKey, () => React.ReactNode>;

/** One page of the admin console. `null` is the console home: the finance dashboard. */
export function AdminPage({ section }: { section: AdminSectionKey | null }) {
  const { t } = useAdminMessages();
  const { status, user } = useSession();

  if (status === "loading") return <ListSkeleton rows={4} />;
  if (user?.role !== "ADMIN") {
    return <EmptyState icon={ShieldX} title={t("noAccess")} description={t("noAccessDescription")} />;
  }
  if (section === null) return <FinancePage />;

  const Content = SECTIONS[section];
  const item = ADMIN_SECTIONS.find((candidate) => candidate.section === section)!;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t(item.labelKey)} />
      <Content />
    </div>
  );
}

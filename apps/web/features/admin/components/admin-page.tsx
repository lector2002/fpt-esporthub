"use client";

import { ShieldX } from "lucide-react";
import { EmptyState, ListSkeleton } from "@/components/common/query-state";
import { PageHeader } from "@/components/common/page-header";
import { useSession } from "@/lib/session";
import { useAdminMessages } from "../messages";
import { ADMIN_SECTIONS, type AdminSectionKey } from "../nav";
import { CommunitiesTab } from "./communities-tab";
import { CommunityDetail } from "./community-detail";
import { CupDetail } from "./cup-detail";
import { CupsTab } from "./cups-tab";
import { EventDetail } from "./event-detail";
import { EventsTab } from "./events-tab";
import { FinancePage } from "./finance-page";
import { OverviewTab } from "./overview-tab";
import { ReportsTab } from "./reports-tab";
import { TeamDetail } from "./team-detail";
import { TeamsTab } from "./teams-tab";
import { UserDetail } from "./user-detail";
import { UsersTab } from "./users-tab";
import { VenueDetail } from "./venue-detail";
import { VenuesTab } from "./venues-tab";
import { CoachDetail } from "./coach-detail";
import { CoachesTab } from "./coaches-tab";
import { AdminCreditsTab } from "@/features/credits/components/admin-credits-tab";

const SECTIONS = {
  credits: AdminCreditsTab,
  overview: OverviewTab,
  users: UsersTab,
  reports: ReportsTab,
  teams: TeamsTab,
  communities: CommunitiesTab,
  events: EventsTab,
  cups: CupsTab,
  venues: VenuesTab,
  coaches: CoachesTab,
} satisfies Record<AdminSectionKey, () => React.ReactNode>;

/** Detail pages; keep in step with `hasAdminDetail` in nav.ts. */
const DETAILS: Partial<Record<AdminSectionKey, (props: { id: string }) => React.ReactNode>> = {
  users: UserDetail,
  teams: TeamDetail,
  events: EventDetail,
  cups: CupDetail,
  venues: VenueDetail,
  coaches: CoachDetail,
  communities: CommunityDetail,
};

/** One page of the admin console. `null` is the console home: the finance dashboard. `detailId` opens one row. */
export function AdminPage({ section, detailId }: { section: AdminSectionKey | null; detailId?: string }) {
  const { t } = useAdminMessages();
  const { status, user } = useSession();

  if (status === "loading") return <ListSkeleton rows={4} />;
  if (user?.role !== "ADMIN") {
    return <EmptyState icon={ShieldX} title={t("noAccess")} description={t("noAccessDescription")} />;
  }
  if (section === null) return <FinancePage />;
  const Detail = detailId ? DETAILS[section] : undefined;
  if (Detail && detailId) return <Detail id={detailId} />;

  const Content = SECTIONS[section];
  const item = ADMIN_SECTIONS.find((candidate) => candidate.section === section)!;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t(item.labelKey)} />
      <Content />
    </div>
  );
}

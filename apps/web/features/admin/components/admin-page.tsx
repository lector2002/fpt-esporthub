"use client";

import { ShieldX } from "lucide-react";
import { EmptyState, ListSkeleton } from "@/components/common/query-state";
import { PageHeader } from "@/components/common/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/lib/session";
import { useAdminMessages } from "../messages";
import { EventsTab } from "./events-tab";
import { OverviewTab } from "./overview-tab";
import { ReportsTab } from "./reports-tab";
import { TeamsTab } from "./teams-tab";
import { UsersTab } from "./users-tab";
import { VenuesTab } from "./venues-tab";
import { CoachesTab } from "./coaches-tab";
import { AdminCreditsTab } from "@/features/credits/components/admin-credits-tab";

const TABS = [
  { value: "overview", label: "tabOverview", Content: OverviewTab },
  { value: "users", label: "tabUsers", Content: UsersTab },
  { value: "reports", label: "tabReports", Content: ReportsTab },
  { value: "teams", label: "tabTeams", Content: TeamsTab },
  { value: "events", label: "tabEvents", Content: EventsTab },
  { value: "venues", label: "tabVenues", Content: VenuesTab },
  { value: "coaches", label: "tabCoaches", Content: CoachesTab },
  { value: "credits", label: "tabCredits", Content: AdminCreditsTab },
] as const;

export function AdminPage() {
  const { t } = useAdminMessages();
  const { status, user } = useSession();

  if (status === "loading") return <ListSkeleton rows={4} />;
  if (user?.role !== "ADMIN") {
    return <EmptyState icon={ShieldX} title={t("noAccess")} description={t("noAccessDescription")} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} />
      <Tabs defaultValue="overview" className="gap-4">
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {t(tab.label)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {TABS.map(({ value, Content }) => (
          <TabsContent key={value} value={value}>
            <Content />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

"use client";

import Link from "next/link";
import { CalendarX, ChevronLeft, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, QueryState } from "@/components/common/query-state";
import { useCoachingRequests } from "../api";
import { useCoachingMessages } from "../messages";
import type { CoachingRequest, CoachingRequests } from "../types";
import { SessionCard } from "./session-card";

/** Requests waiting on the viewer, for the tab count. */
function actionableCount(requests: CoachingRequest[]) {
  return requests.filter((request) => request.canAgree || request.canCounter).length;
}

function SessionList({ requests, empty }: { requests: CoachingRequest[]; empty: React.ReactNode }) {
  if (requests.length === 0) return <>{empty}</>;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {requests.map((request) => (
        <SessionCard key={request.id} request={request} />
      ))}
    </div>
  );
}

function TabLabel({ label, count }: { label: string; count: number }) {
  return (
    <>
      {label}
      {count > 0 && <Badge className="h-4 min-w-4 px-1">{count}</Badge>}
    </>
  );
}

function PlayerEmpty() {
  const { t } = useCoachingMessages();
  return (
    <EmptyState
      icon={CalendarX}
      title={t("emptyAsPlayer")}
      action={
        <Button asChild>
          <Link href="/coaches">{t("browseCoaches")}</Link>
        </Button>
      }
    />
  );
}

function CoachEmpty() {
  const { t } = useCoachingMessages();
  return (
    <EmptyState
      icon={GraduationCap}
      title={t("emptyAsCoach")}
      action={
        <Button asChild variant="outline">
          <Link href="/coaches/me">{t("myCoachProfile")}</Link>
        </Button>
      }
    />
  );
}

function SessionTabs({ data }: { data: CoachingRequests }) {
  const { t } = useCoachingMessages();
  const initialTab = data.asPlayer.length === 0 && data.asCoach.length > 0 ? "coach" : "player";
  return (
    <Tabs defaultValue={initialTab} className="gap-4">
      <TabsList>
        <TabsTrigger value="player">
          <TabLabel label={t("asPlayer")} count={actionableCount(data.asPlayer)} />
        </TabsTrigger>
        <TabsTrigger value="coach">
          <TabLabel label={t("asCoach")} count={actionableCount(data.asCoach)} />
        </TabsTrigger>
      </TabsList>
      <TabsContent value="player">
        <SessionList requests={data.asPlayer} empty={<PlayerEmpty />} />
      </TabsContent>
      <TabsContent value="coach">
        <SessionList requests={data.asCoach} empty={<CoachEmpty />} />
      </TabsContent>
    </Tabs>
  );
}

export function SessionsView() {
  const { t } = useCoachingMessages();
  const requests = useCoachingRequests();
  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/coaches">
          <ChevronLeft /> {t("allCoaches")}
        </Link>
      </Button>
      <PageHeader title={t("sessionsTitle")} />
      <QueryState query={requests}>{(data) => <SessionTabs data={data} />}</QueryState>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Inbox, LogOut, MessagesSquare, Pencil, Trash2, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { FeatureTeamPanel } from "@/features/credits/components/promotions";
import { useMatchRequests } from "@/features/requests/api";
import { roomHref } from "@/features/voice/components/call-bar";
import { useVoiceState } from "@/features/voice/store";
import { useDeleteTeam, useLeaveTeam, useUpdateTeam } from "../api";
import { useTeamMessages } from "../messages";
import type { TeamDetail } from "../types";
import { ConfirmAction } from "./confirm-action";
import { TeamJoinAction } from "./team-card";

/** Header actions by viewer membership: room for the roster, leave for members, apply for everyone else. */
export function TeamHeaderActions({ team }: { team: TeamDetail }) {
  if (!team.viewerMembership) return <TeamJoinAction team={team} />;
  return (
    <>
      <TeamRoomButton team={team} />
      {team.viewerMembership === "member" && <LeaveTeamButton team={team} />}
    </>
  );
}

/** Shows how many teammates are in voice right now. */
function TeamRoomButton({ team }: { team: TeamDetail }) {
  const { t } = useTeamMessages();
  const inVoice = useVoiceState().rooms[team.id]?.participants.length ?? 0;
  return (
    <Button asChild>
      <Link href={roomHref(team.id)}>
        <MessagesSquare /> {t("openRoom")}
        {inVoice > 0 && (
          <span className="flex items-center gap-1 text-xs" aria-label={t("inVoiceCount", { count: inVoice })}>
            <Volume2 className="size-3.5" aria-hidden /> {inVoice}
          </span>
        )}
      </Link>
    </Button>
  );
}

function LeaveTeamButton({ team }: { team: TeamDetail }) {
  const { t } = useTeamMessages();
  const router = useRouter();
  const leave = useLeaveTeam(team.id);

  const onConfirm = () =>
    leave.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("leftTeam"));
        router.push("/teams");
      },
      onError: (error) => toast.error(error.message),
    });

  return (
    <ConfirmAction
      title={t("leaveTeamTitle", { name: team.name })}
      description={t("leaveTeamDescription")}
      confirmLabel={t("leaveTeam")}
      onConfirm={onConfirm}
      trigger={
        <Button variant="outline" disabled={leave.isPending}>
          <LogOut /> {t("leaveTeam")}
        </Button>
      }
    />
  );
}

export function CaptainTools({ team }: { team: TeamDetail }) {
  const { t } = useTeamMessages();
  const update = useUpdateTeam(team.id);
  const pending =
    useMatchRequests().data?.incoming.filter((request) => request.status === "PENDING" && request.team?.id === team.id).length ?? 0;

  const toggleRecruitment = (open: boolean) =>
    update.mutate(
      { recruitmentOpen: open },
      {
        onSuccess: () => toast.success(t(open ? "recruitmentOpened" : "recruitmentClosed")),
        onError: (error) => toast.error(error.message),
      },
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("manageTeam")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="recruitment-open">{t("acceptApplications")}</Label>
          <Switch
            id="recruitment-open"
            checked={team.recruitmentOpen}
            disabled={update.isPending}
            onCheckedChange={toggleRecruitment}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild variant="outline" className="justify-start">
            <Link href="/inbox?tab=requests">
              <Inbox /> <span className="flex-1 text-left">{t("pendingApplications")}</span>
              {pending > 0 && (
                <Badge variant="secondary" className="tabular-nums">
                  {pending}
                </Badge>
              )}
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href={`/teams/${team.id}/edit`}>
              <Pencil /> {t("edit")}
            </Link>
          </Button>
        </div>
        <Separator />
        <FeatureTeamPanel teamId={team.id} featuredUntil={team.featuredUntil} recruitmentOpen={team.recruitmentOpen} />
        <Separator />
        <DeleteTeamButton team={team} />
      </CardContent>
    </Card>
  );
}

function DeleteTeamButton({ team }: { team: TeamDetail }) {
  const { t } = useTeamMessages();
  const router = useRouter();
  const remove = useDeleteTeam(team.id);

  const onConfirm = () =>
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("teamDeleted"));
        router.push("/teams");
      },
      onError: (error) => toast.error(error.message),
    });

  return (
    <ConfirmAction
      title={t("deleteTeamTitle", { name: team.name })}
      description={t("deleteTeamDescription")}
      confirmLabel={t("deleteTeam")}
      onConfirm={onConfirm}
      trigger={
        <Button variant="ghost" className="justify-start text-destructive hover:text-destructive" disabled={remove.isPending}>
          <Trash2 /> {t("deleteTeam")}
        </Button>
      }
    />
  );
}

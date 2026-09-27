"use client";

import Link from "next/link";
import { CalendarClock, Crown, Users } from "lucide-react";
import { AramBadge } from "@/components/common/badges";
import { ABOVE_CARD_LINK, CARD_HOVER, CardLink } from "@/components/common/card-link";
import { SplashBanner } from "@/components/common/champion-splash";
import { RankEmblem } from "@/components/common/rank-emblem";
import { UserAvatar } from "@/components/common/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PromotedBadge } from "@/features/credits/components/promotions";
import { mediaUrl } from "@/lib/media";
import { SendRequestButton } from "@/features/requests/components/send-request-button";
import { cn } from "@/lib/utils";
import { roleLabel, useTeamLabels } from "../labels";
import { useTeamMessages } from "../messages";
import type { LookupOption, TeamSummary } from "../types";

export function TeamStatusBadge({ team }: { team: TeamSummary }) {
  const { t } = useTeamMessages();
  if (team.memberCount >= team.maxMembers) return <Badge variant="secondary">{t("full")}</Badge>;
  if (!team.recruitmentOpen) return <Badge variant="secondary">{t("closed")}</Badge>;
  return (
    <Badge variant="outline" className="text-success">
      {t("recruiting")}
    </Badge>
  );
}

export function RoleChips({ roles, values }: { roles: LookupOption[] | undefined; values: string[] }) {
  const { t } = useTeamMessages();
  if (values.length === 0) return <span className="text-muted-foreground">{t("noNeededRoles")}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((value) => (
        <Badge key={value} variant="outline" className="text-primary">
          {roleLabel(roles, value)}
        </Badge>
      ))}
    </div>
  );
}

function canApply(team: TeamSummary) {
  return !team.viewerMembership && team.recruitmentOpen && team.memberCount < team.maxMembers;
}

/** Join action: "Your team" for members, an apply button for open teams, nothing otherwise. */
export function TeamJoinAction({ team, variant }: { team: TeamSummary; variant?: "default" | "outline" }) {
  const { t } = useTeamMessages();
  if (team.viewerMembership) return <Badge variant="secondary">{t("yourTeam")}</Badge>;
  if (!canApply(team)) return null;
  return <SendRequestButton targetType="team" targetId={team.id} targetName={team.name} variant={variant} />;
}

export function TeamCard({ team, roles }: { team: TeamSummary; roles: LookupOption[] | undefined }) {
  const { t } = useTeamMessages();
  const labels = useTeamLabels();
  const aram = team.mode === "aram";

  return (
    <Card size="sm" className={cn("h-full pt-0", CARD_HOVER)}>
      <CardLink href={`/teams/${team.id}`} />
      <SplashBanner src={mediaUrl(team.coverKey) ?? `/images/event-${team.game}.webp`} className="h-16" />
      <CardHeader className="relative -mt-9">
        <div className="flex items-end justify-between gap-2">
          <div className="flex min-w-0 items-end gap-2.5">
            <UserAvatar name={team.name} imageKey={team.logoKey} kind="team" className="size-12 ring-4 ring-card" />
            <CardTitle className="min-w-0 truncate">
              <Link href={`/teams/${team.id}`} className="hover:text-primary focus-visible:underline">
                {team.name}
              </Link>
            </CardTitle>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {team.featuredUntil && <PromotedBadge kind="featured" />}
            <TeamStatusBadge team={team} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2.5">
        {aram ? (
          <AramBadge />
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">{t("needs")}</span>
            <RoleChips roles={roles} values={team.neededRoles} />
          </div>
        )}
        <ul className="grid gap-1.5 text-muted-foreground">
          <InfoRow icon={Users} label={t("memberCount", { count: team.memberCount, max: team.maxMembers })} />
          {!aram && (
            <li className="flex min-w-0 items-center gap-1.5">
              <RankEmblem game={team.game} tier={team.rankMin} className="size-5" />
              <span className="truncate">{team.rankMin === team.rankMax ? team.rankMin : `${team.rankMin} - ${team.rankMax}`}</span>
              {team.rankMin !== team.rankMax && <RankEmblem game={team.game} tier={team.rankMax} className="size-5" />}
            </li>
          )}
          {team.schedule.length > 0 && (
            <InfoRow icon={CalendarClock} label={team.schedule.map(labels.slot).join(", ")} />
          )}
          <InfoRow icon={Crown} label={team.captain.displayName} />
        </ul>
      </CardContent>
      {(team.viewerMembership || canApply(team)) && (
        <CardFooter className={cn("justify-end border-t py-3", ABOVE_CARD_LINK)}>
          <TeamJoinAction team={team} variant="outline" />
        </CardFooter>
      )}
    </Card>
  );
}

function InfoRow({ icon: Icon, label }: { icon: typeof Users; label: string }) {
  return (
    <li className="flex min-w-0 items-center gap-2">
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </li>
  );
}

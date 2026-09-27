"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Crown, UserMinus } from "lucide-react";
import { ReputationBadge } from "@/components/common/badges";
import { UserAvatar } from "@/components/common/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRank } from "@/lib/contracts";
import { useRemoveMember } from "../api";
import { roleLabel } from "../labels";
import { useTeamMessages } from "../messages";
import type { LookupOption, TeamDetail, TeamMemberView } from "../types";
import { ConfirmAction } from "./confirm-action";

export function TeamRoster({ team, roles }: { team: TeamDetail; roles: LookupOption[] | undefined }) {
  const { t } = useTeamMessages();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("roster")} <span className="text-muted-foreground">({team.memberCount}/{team.maxMembers})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y divide-border">
          {team.members.map((member) => (
            <RosterRow key={member.userId} team={team} member={member} roles={roles} />
          ))}
          {Array.from({ length: Math.max(0, team.maxMembers - team.memberCount) }, (_, index) => {
            const role = team.mode === "aram" ? undefined : team.neededRoles[index];
            return (
              <li key={`open-${index}`} className="flex items-center gap-3 py-3 text-sm text-muted-foreground first:pt-0 last:pb-0" data-open-slot>
                <span className="size-8 shrink-0 rounded-full border border-dashed border-border" aria-hidden />
                {role ? t("openSlotRole", { role: roleLabel(roles, role) }) : t("openSlot")}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function RosterRow({ team, member, roles }: { team: TeamDetail; member: TeamMemberView; roles: LookupOption[] | undefined }) {
  const { t } = useTeamMessages();
  const canRemove = team.viewerMembership === "captain" && member.teamRole !== "captain";

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <UserAvatar name={member.displayName} imageKey={member.avatarKey} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/players/${member.userId}`} className="truncate font-medium hover:text-primary">
            {member.displayName}
          </Link>
          {member.teamRole === "captain" && (
            <Badge variant="outline" className="text-primary">
              <Crown /> {t("captain")}
            </Badge>
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {member.profile
            ? `${formatRank(member.profile)} · ${roleLabel(roles, member.profile.role)}`
            : t("noProfile")}
        </p>
      </div>
      <ReputationBadge badge={member.reputationBadge} className="hidden sm:inline-flex" />
      {canRemove && <RemoveMemberButton teamId={team.id} member={member} />}
    </li>
  );
}

function RemoveMemberButton({ teamId, member }: { teamId: string; member: TeamMemberView }) {
  const { t } = useTeamMessages();
  const removeMember = useRemoveMember(teamId);

  const onConfirm = () =>
    removeMember.mutate(member.userId, {
      onSuccess: () => toast.success(t("memberRemoved")),
      onError: (error) => toast.error(error.message),
    });

  return (
    <ConfirmAction
      title={t("removeMemberTitle", { name: member.displayName })}
      description={t("removeMemberDescription")}
      confirmLabel={t("removeMember")}
      onConfirm={onConfirm}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={removeMember.isPending}
          aria-label={t("removeMemberAria", { name: member.displayName })}
        >
          <UserMinus />
        </Button>
      }
    />
  );
}

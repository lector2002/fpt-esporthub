"use client";

import Link from "next/link";
import { Crown, Volume2 } from "lucide-react";
import { UserAvatar } from "@/components/common/user-avatar";
import type { TeamDetail, TeamMemberView } from "@/features/teams/types";
import { useVoiceState } from "@/features/voice/store";
import { useTeamRoomMessages } from "../messages";

/** Right column: roster grouped by role, with who is in voice. */
export function MemberList({ team }: { team: TeamDetail }) {
  const { t } = useTeamRoomMessages();
  const room = useVoiceState().rooms[team.id];
  const inVoice = new Set(room?.participants.map((p) => p.userId));
  const groups = [
    { label: t("captain"), members: team.members.filter((m) => m.teamRole === "captain") },
    { label: t("members"), members: team.members.filter((m) => m.teamRole !== "captain") },
  ].filter((group) => group.members.length > 0);

  return (
    <div className="flex flex-col gap-4 p-3">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label} className="flex flex-col gap-1">
          <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase">
            {t("groupCount", { label: group.label, count: group.members.length })}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {group.members.map((member) => (
              <MemberRow key={member.userId} member={member} inVoice={inVoice.has(member.userId)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MemberRow({ member, inVoice }: { member: TeamMemberView; inVoice: boolean }) {
  const { t } = useTeamRoomMessages();
  return (
    <li>
      <Link
        href={`/players/${member.userId}`}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <UserAvatar name={member.displayName} imageKey={member.avatarKey} className="size-8" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-medium">{member.displayName}</span>
            {member.teamRole === "captain" && <Crown className="size-3.5 shrink-0 text-warning" aria-label={t("captain")} />}
          </span>
          {member.profile && (
            <span className="block truncate text-xs text-muted-foreground">
              {member.profile.rankTier}
              {member.profile.rankLevel ? ` ${member.profile.rankLevel}` : ""}
            </span>
          )}
        </span>
        {inVoice && <Volume2 className="size-4 shrink-0 text-success" aria-label={t("inVoice")} />}
      </Link>
    </li>
  );
}

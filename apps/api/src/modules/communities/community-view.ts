import type { Community } from "@fpt-esporthub/database";
import { toGameSlug } from "../../common/game";

/** Relations every community card needs; `members` is narrowed to the viewer's own row. */
export const communitySummaryInclude = (viewerId: string) =>
  ({
    owner: { select: { id: true, displayName: true } },
    members: { where: { userId: viewerId }, select: { role: true } },
    channels: { where: { kind: "VOICE" }, select: { id: true } },
    _count: { select: { members: true, channels: true } },
  }) as const;

type CommunityWithSummary = Community & {
  owner: { id: string; displayName: string };
  members: { role: string }[];
  channels: { id: string }[];
  _count: { members: number; channels: number };
};

/** `inVoice`: people sitting in any of its voice channels right now. */
export function toCommunitySummary(community: CommunityWithSummary, inVoice: number) {
  return {
    id: community.id,
    name: community.name,
    description: community.description,
    game: community.game ? toGameSlug(community.game) : null,
    iconKey: community.iconKey,
    coverKey: community.coverKey,
    owner: community.owner,
    memberCount: community._count.members,
    channelCount: community._count.channels,
    inVoice,
    /** "owner" | "member" | null (not joined). */
    viewerRole: community.members[0]?.role ?? null,
    createdAt: community.createdAt,
  };
}

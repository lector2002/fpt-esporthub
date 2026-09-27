import type { Team } from "@fpt-esporthub/database";
import { toGameSlug } from "../../common/game";
import { isPromoted } from "../credits/promotion";
import type { PrismaService } from "../prisma/prisma.service";
import { TEAM_MAX_MEMBERS } from "./team-rules";

export type ViewerMembership = "captain" | "member" | null;

/** Relations every team response needs: captain name and the member list (for count + viewer membership). */
export const TEAM_SUMMARY_INCLUDE = {
  captain: { select: { id: true, displayName: true } },
  members: { select: { userId: true } },
} as const;

type TeamWithSummary = Team & { captain: { id: string; displayName: string }; members: { userId: string }[] };

export function viewerMembership(team: { captainId: string; members: { userId: string }[] }, viewerId?: string): ViewerMembership {
  if (!viewerId) return null;
  if (team.captainId === viewerId) return "captain";
  return team.members.some((member) => member.userId === viewerId) ? "member" : null;
}

export function toTeamSummary(team: TeamWithSummary, viewerId?: string) {
  return {
    id: team.id,
    name: team.name,
    logoKey: team.logoKey,
    coverKey: team.coverKey,
    featuredUntil: isPromoted(team.featuredUntil) ? team.featuredUntil : null,
    game: toGameSlug(team.game),
    mode: team.mode,
    description: team.description,
    rankMin: team.rankMin,
    rankMax: team.rankMax,
    neededRoles: team.neededRoles,
    schedule: team.schedule,
    goals: team.goals,
    communicationStyle: team.communicationStyle,
    recruitmentOpen: team.recruitmentOpen,
    memberCount: team.members.length,
    maxMembers: TEAM_MAX_MEMBERS,
    captain: team.captain,
    viewerMembership: viewerMembership(team, viewerId),
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

/** Users the viewer blocked plus users who blocked the viewer. */
export async function blockedUserIds(prisma: PrismaService, userId: string): Promise<string[]> {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return [...new Set(blocks.map((block) => (block.blockerId === userId ? block.blockedId : block.blockerId)))];
}

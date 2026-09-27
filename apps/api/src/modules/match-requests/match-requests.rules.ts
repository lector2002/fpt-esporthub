import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { GameId, MatchRequestType } from "@fpt-esporthub/database";
import { PrismaService } from "../prisma/prisma.service";
import { findActiveProfile } from "../../common/game";
import { joinTeamChat } from "../teams/team-chat";
import { MAX_TEAM_MEMBERS } from "./match-requests.constants";

/** PrismaService or a transaction client: the roster and the team chat delegates. */
type MemberDb = Pick<PrismaService, "teamMember" | "conversation" | "conversationParticipant">;

/** Validation shared by create/accept. Each throws the HTTP error the client should see. */
export class MatchRequestRules {
  constructor(private prisma: PrismaService) {}

  async ensureNotBlocked(userId: string, targetId: string) {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: targetId },
          { blockerId: targetId, blockedId: userId },
        ],
      },
    });
    if (block) throw new ForbiddenException("Cannot send a request to this user");
  }

  /** The sender's onboarded profile for `game` (or their first profile when no game is given). */
  async requireSenderProfile(userId: string, game: GameId | undefined) {
    const profile = await findActiveProfile(this.prisma, userId, game);
    if (!profile || !profile.onboardingComplete) {
      throw new ForbiddenException("Complete onboarding for this game first");
    }
    return profile;
  }

  /** Restricted and banned accounts can't be contacted; they look the same as a missing player. */
  async ensureReachable(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
    if (!user || user.status === "RESTRICTED" || user.status === "BANNED") throw new NotFoundException("Player not found");
  }

  async requirePlayerForGame(userId: string, game: GameId) {
    await this.ensureReachable(userId);
    const profile = await this.prisma.playerProfile.findUnique({
      where: { userId_game: { userId, game } },
      select: { id: true },
    });
    if (!profile) throw new BadRequestException("This player has no profile for this game");
  }

  async requireTeam(teamId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException("Team not found");
    return team;
  }

  /** One open thread per player pair, in either direction; accepted pairs already have a chat. */
  async ensureNoPlayerThread(senderId: string, receiverId: string) {
    const existing = await this.prisma.matchRequest.findFirst({
      where: {
        type: "PLAYER_TO_PLAYER",
        status: { in: ["PENDING", "ACCEPTED"] },
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
      select: { status: true, senderId: true },
    });
    if (!existing) return;
    if (existing.status === "ACCEPTED") throw new ConflictException("You are already connected with this player");
    if (existing.senderId === senderId) throw new ConflictException("A pending request to this player already exists");
    throw new ConflictException("This player already sent you a request");
  }

  async ensureNoPendingTeamRequest(type: MatchRequestType, teamId: string, playerId: string) {
    const player = type === "PLAYER_TO_TEAM" ? { senderId: playerId } : { receiverId: playerId };
    const existing = await this.prisma.matchRequest.findFirst({
      where: { type, teamId, status: "PENDING", ...player },
      select: { id: true },
    });
    if (existing) throw new ConflictException("A pending request for this team already exists");
  }

  async ensureNotMember(teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { id: true },
    });
    if (member) throw new ConflictException("Player is already on this team");
  }

  async ensureTeamHasRoom(teamId: string, game: GameId, db: MemberDb = this.prisma) {
    const count = await db.teamMember.count({ where: { teamId } });
    if (count >= MAX_TEAM_MEMBERS[game]) throw new ConflictException("Team is full");
  }

  /** Adds the player to the roster inside the accept transaction, respecting the cap. */
  async addMember(db: MemberDb, teamId: string, game: GameId, userId: string) {
    const member = await db.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
    if (member) return;
    await this.ensureTeamHasRoom(teamId, game, db);
    await db.teamMember.create({ data: { teamId, userId } });
    await joinTeamChat(db, teamId, userId);
  }
}

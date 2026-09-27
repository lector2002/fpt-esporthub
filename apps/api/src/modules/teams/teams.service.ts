import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { GameId } from "@fpt-esporthub/database";
import { parseGame } from "../../common/game";
import { PLAY_MODE_IDS, type PlayMode } from "../lookups/lookup-data";
import { promotedFirst } from "../credits/promotion";
import { listAchievements } from "../media/achievement-view";
import { MediaStorage } from "../media/media-storage";
import { PrismaService } from "../prisma/prisma.service";
import { CallService } from "../realtime/call.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";
import {
  TEAM_MAX_MEMBERS,
  modeFields,
  resolveTeamMode,
  roleMatches,
  validateCommunicationStyle,
  validateGoals,
} from "./team-rules";
import { joinTeamChat, leaveTeamChat } from "./team-chat";
import { TEAM_SUMMARY_INCLUDE, blockedUserIds, toTeamSummary } from "./team-view";

export interface TeamListFilter {
  game?: string;
  recruiting?: boolean;
  role?: string;
  /** "ranked" or "aram"; omitted lists both. */
  mode?: string;
}

@Injectable()
export class TeamsService {
  constructor(
    private prisma: PrismaService,
    private calls: CallService,
    private storage: MediaStorage,
  ) {}

  async findAll(viewerId: string, filter: TeamListFilter) {
    const game = parseGame(filter.game);
    const mode = filter.mode || undefined;
    if (mode && !PLAY_MODE_IDS.includes(mode as PlayMode)) throw new BadRequestException("Unknown team mode");
    const blocked = await blockedUserIds(this.prisma, viewerId);
    const teams = await this.prisma.team.findMany({
      where: {
        ...(game ? { game } : {}),
        ...(mode ? { mode } : {}),
        ...(filter.recruiting ? { recruitmentOpen: true } : {}),
        captainId: { notIn: blocked },
      },
      include: TEAM_SUMMARY_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    const role = filter.role?.trim();
    const visible = teams.filter(
      (team) =>
        (!filter.recruiting || team.members.length < TEAM_MAX_MEMBERS) &&
        (!role || team.neededRoles.some((needed) => roleMatches(needed, role))),
    );
    return { teams: promotedFirst(visible, (team) => team.featuredUntil).map((team) => toTeamSummary(team, viewerId)) };
  }

  async findMine(viewerId: string, gameSlug?: string) {
    const game = parseGame(gameSlug);
    const teams = await this.prisma.team.findMany({
      where: { ...(game ? { game } : {}), members: { some: { userId: viewerId } } },
      include: TEAM_SUMMARY_INCLUDE,
      orderBy: { createdAt: "asc" },
    });
    return { teams: teams.map((team) => toTeamSummary(team, viewerId)) };
  }

  /** Open, non-full teams of a game, newest first. Used by event detail. */
  async findRecruiting(game: GameId, viewerId: string | undefined, limit: number) {
    const blocked = viewerId ? await blockedUserIds(this.prisma, viewerId) : [];
    const teams = await this.prisma.team.findMany({
      where: { game, recruitmentOpen: true, captainId: { notIn: blocked } },
      include: TEAM_SUMMARY_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return promotedFirst(
      teams.filter((team) => team.members.length < TEAM_MAX_MEMBERS),
      (team) => team.featuredUntil,
    )
      .slice(0, limit)
      .map((team) => toTeamSummary(team, viewerId));
  }

  async findOne(teamId: string, viewerId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, include: TEAM_SUMMARY_INCLUDE });
    if (!team) throw new NotFoundException("Team not found");
    const blocked = await blockedUserIds(this.prisma, viewerId);
    if (blocked.includes(team.captainId)) throw new NotFoundException("Team not found");

    const members = await this.prisma.teamMember.findMany({
      where: { teamId },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            reputationBadge: true,
            avatarKey: true,
            profiles: { where: { game: team.game }, select: { rankTier: true, rankLevel: true, role: true } },
          },
        },
      },
    });
    const isMember = members.some((member) => member.userId === viewerId);
    const [room, achievements] = await Promise.all([
      isMember ? this.prisma.conversation.findUnique({ where: { teamId }, select: { id: true } }) : null,
      listAchievements(this.prisma, { teamId }),
    ]);

    return {
      team: {
        ...toTeamSummary(team, viewerId),
        /** Members only: the team room's chat. */
        conversationId: room?.id ?? null,
        members: members.map((member) => ({
          userId: member.userId,
          displayName: member.user.displayName,
          teamRole: member.userId === team.captainId ? "captain" : "member",
          reputationBadge: member.user.reputationBadge,
          avatarKey: member.user.avatarKey,
          profile: member.user.profiles[0] ?? null,
          joinedAt: member.createdAt,
        })),
        achievements,
      },
    };
  }

  async create(captainId: string, dto: CreateTeamDto) {
    const game = parseGame(dto.game);
    if (!game) throw new BadRequestException("Game is required");
    const profile = await this.prisma.playerProfile.findUnique({ where: { userId_game: { userId: captainId, game } } });
    if (!profile) throw new BadRequestException("Create a profile for this game first");

    const team = await this.prisma.$transaction(async (tx) => {
      const created = await tx.team.create({
        data: {
          captainId,
          game,
          name: cleanName(dto.name),
          ...modeFields(game, resolveTeamMode(game, dto.mode), dto),
          schedule: [...new Set(dto.schedule)],
          goals: validateGoals(dto.goals),
          communicationStyle: validateCommunicationStyle(dto.communicationStyle),
          description: cleanDescription(dto.description),
          recruitmentOpen: dto.recruitmentOpen ?? true,
        },
      });
      await tx.teamMember.create({ data: { teamId: created.id, userId: captainId, role: "captain" } });
      await joinTeamChat(tx, created.id, captainId);
      return created;
    });

    return this.findOne(team.id, captainId);
  }

  async update(teamId: string, userId: string, dto: UpdateTeamDto) {
    const team = await this.requireCaptain(teamId, userId);
    const mode = resolveTeamMode(team.game, dto.mode, team.mode);
    // ARAM teams ignore rank range and roles; ranked teams re-validate them only when something changed.
    const touched = dto.rankMin !== undefined || dto.rankMax !== undefined || dto.neededRoles !== undefined;
    const shape = mode !== team.mode || (mode === "ranked" && touched) ? modeFields(team.game, mode, dto, team) : {};

    await this.prisma.team.update({
      where: { id: teamId },
      data: {
        ...shape,
        ...(dto.name !== undefined ? { name: cleanName(dto.name) } : {}),
        ...(dto.schedule !== undefined ? { schedule: [...new Set(dto.schedule)] } : {}),
        ...(dto.goals !== undefined ? { goals: validateGoals(dto.goals) } : {}),
        ...(dto.communicationStyle !== undefined
          ? { communicationStyle: validateCommunicationStyle(dto.communicationStyle) }
          : {}),
        ...(dto.description !== undefined ? { description: cleanDescription(dto.description) } : {}),
        ...(dto.recruitmentOpen !== undefined ? { recruitmentOpen: dto.recruitmentOpen } : {}),
      },
    });

    return this.findOne(teamId, userId);
  }

  /** Captain disbands the team. Pending applications to it are cancelled first. */
  async remove(teamId: string, userId: string) {
    await this.requireCaptain(teamId, userId);
    const [logo, achievements] = await Promise.all([
      this.prisma.team.findUnique({ where: { id: teamId }, select: { logoKey: true, coverKey: true } }),
      this.prisma.achievement.findMany({ where: { teamId }, select: { imageKey: true } }),
    ]);
    await this.prisma.$transaction([
      this.prisma.matchRequest.updateMany({ where: { teamId, status: "PENDING" }, data: { status: "CANCELLED" } }),
      this.prisma.team.delete({ where: { id: teamId } }),
    ]);
    this.calls.closeRoom(teamId);
    // Rows cascade with the team; their files would stay on disk forever.
    await Promise.all([logo?.logoKey, logo?.coverKey, ...achievements.map((item) => item.imageKey)].map((key) => this.storage.remove(key)));
    return { success: true };
  }

  async leave(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, include: TEAM_SUMMARY_INCLUDE });
    if (!team) throw new NotFoundException("Team not found");
    if (team.captainId === userId) {
      throw new ConflictException(
        team.members.length > 1
          ? "The captain can't leave. Remove the other members first, then delete the team."
          : "The captain can't leave. Delete the team instead.",
      );
    }
    if (!team.members.some((member) => member.userId === userId)) {
      throw new NotFoundException("You are not a member of this team");
    }
    await this.dropMember(teamId, userId);
    return { success: true };
  }

  async removeMember(teamId: string, captainId: string, memberId: string) {
    await this.requireCaptain(teamId, captainId);
    if (memberId === captainId) throw new BadRequestException("The captain can't remove themselves");
    const membership = await this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: memberId } } });
    if (!membership) throw new NotFoundException("Member not found");
    await this.dropMember(teamId, memberId);
    return { success: true };
  }

  /** Roster, room chat and voice room lose the member together. */
  private async dropMember(teamId: string, userId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.teamMember.delete({ where: { teamId_userId: { teamId, userId } } });
      await leaveTeamChat(tx, teamId, userId);
    });
    this.calls.removeFromRoom(teamId, userId);
  }

  private async requireCaptain(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException("Team not found");
    if (team.captainId !== userId) throw new ForbiddenException("Only the team captain can do this");
    return team;
  }
}

function cleanName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 32) throw new BadRequestException("Team name must be 3-32 characters");
  return trimmed;
}

function cleanDescription(description: string | undefined) {
  const trimmed = description?.trim();
  return trimmed ? trimmed : null;
}

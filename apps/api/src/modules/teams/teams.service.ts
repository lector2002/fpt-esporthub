import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { GameId } from "@fpt-esporthub/database";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";

const GAME_MAP: Record<string, GameId> = {
  valorant: "VALORANT",
  league_of_legends: "LEAGUE_OF_LEGENDS",
};

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async create(captainId: string, dto: CreateTeamDto) {
    const gameId = GAME_MAP[dto.game];
    if (!gameId) {
      throw new NotFoundException(`Unknown game: ${dto.game}`);
    }

    const team = await this.prisma.team.create({
      data: {
        captainId,
        name: dto.name,
        game: gameId,
        rankMin: dto.rankMin,
        rankMax: dto.rankMax,
        neededRoles: dto.neededRoles,
        schedule: dto.schedule,
        goals: dto.goals,
        communicationStyle: dto.communicationStyle,
        description: dto.description ?? null,
        recruitmentOpen: dto.recruitmentOpen ?? true,
      },
      include: {
        captain: { select: { id: true, displayName: true } },
        members: { include: { user: { select: { id: true, displayName: true } } } },
      },
    });

    await this.prisma.teamMember.create({
      data: { teamId: team.id, userId: captainId, role: "captain" },
    });

    return { team };
  }

  async findAll(game?: string) {
    const where: { game?: GameId; recruitmentOpen?: boolean } = {
      recruitmentOpen: true,
    };

    if (game) {
      const gameId = GAME_MAP[game];
      if (!gameId) throw new NotFoundException(`Unknown game: ${game}`);
      where.game = gameId;
    }

    const teams = await this.prisma.team.findMany({
      where,
      include: {
        captain: { select: { id: true, displayName: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { teams };
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        captain: { select: { id: true, displayName: true } },
        members: {
          include: { user: { select: { id: true, displayName: true } } },
        },
      },
    });

    if (!team) throw new NotFoundException("Team not found");
    return { team };
  }

  async update(teamId: string, userId: string, dto: UpdateTeamDto) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });

    if (!team) throw new NotFoundException("Team not found");
    if (team.captainId !== userId) {
      throw new ForbiddenException("Only the team captain can update the team");
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.rankMin !== undefined) data.rankMin = dto.rankMin;
    if (dto.rankMax !== undefined) data.rankMax = dto.rankMax;
    if (dto.neededRoles !== undefined) data.neededRoles = dto.neededRoles;
    if (dto.schedule !== undefined) data.schedule = dto.schedule;
    if (dto.goals !== undefined) data.goals = dto.goals;
    if (dto.communicationStyle !== undefined)
      data.communicationStyle = dto.communicationStyle;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.recruitmentOpen !== undefined)
      data.recruitmentOpen = dto.recruitmentOpen;

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data,
      include: {
        captain: { select: { id: true, displayName: true } },
        members: {
          include: { user: { select: { id: true, displayName: true } } },
        },
      },
    });

    return { team: updated };
  }
}

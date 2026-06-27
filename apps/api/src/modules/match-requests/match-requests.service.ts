import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import {
  MatchRequestStatus,
  MatchRequestType,
} from "@fpt-esporthub/database";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMatchRequestDto } from "./dto/create-match-request.dto";

@Injectable()
export class MatchRequestsService {
  constructor(private prisma: PrismaService) {}

  async create(senderId: string, dto: CreateMatchRequestDto) {
    const type = dto.type as MatchRequestType;

    if (type === "PLAYER_TO_PLAYER") {
      if (!dto.receiverId) {
        throw new BadRequestException("receiverId is required for player-to-player requests");
      }
      if (dto.receiverId === senderId) {
        throw new BadRequestException("Cannot send a request to yourself");
      }

      const receiver = await this.prisma.user.findUnique({
        where: { id: dto.receiverId },
      });
      if (!receiver) throw new NotFoundException("Receiver not found");

      await this.ensureNotBlocked(senderId, dto.receiverId);

      const existing = await this.prisma.matchRequest.findFirst({
        where: {
          senderId,
          receiverId: dto.receiverId,
          type: "PLAYER_TO_PLAYER",
          status: "PENDING",
        },
      });
      if (existing) {
        throw new ConflictException("A pending request to this player already exists");
      }
    } else if (type === "PLAYER_TO_TEAM") {
      if (!dto.teamId) {
        throw new BadRequestException("teamId is required for player-to-team requests");
      }

      const team = await this.prisma.team.findUnique({
        where: { id: dto.teamId },
      });
      if (!team) throw new NotFoundException("Team not found");
      if (!team.recruitmentOpen) {
        throw new ForbiddenException("Team recruitment is closed");
      }
      if (team.captainId === senderId) {
        throw new BadRequestException("Cannot apply to your own team");
      }

      await this.ensureNotBlocked(senderId, team.captainId);

      const existing = await this.prisma.matchRequest.findFirst({
        where: {
          senderId,
          teamId: dto.teamId,
          type: "PLAYER_TO_TEAM",
          status: "PENDING",
        },
      });
      if (existing) {
        throw new ConflictException("A pending request to this team already exists");
      }
    } else if (type === "TEAM_TO_PLAYER") {
      if (!dto.receiverId || !dto.teamId) {
        throw new BadRequestException("receiverId and teamId are required for team-to-player invites");
      }

      const team = await this.prisma.team.findUnique({
        where: { id: dto.teamId },
      });
      if (!team) throw new NotFoundException("Team not found");
      if (team.captainId !== senderId) {
        throw new ForbiddenException("Only the team captain can send invites");
      }

      await this.ensureNotBlocked(senderId, dto.receiverId);

      const existing = await this.prisma.matchRequest.findFirst({
        where: {
          senderId,
          receiverId: dto.receiverId,
          teamId: dto.teamId,
          type: "TEAM_TO_PLAYER",
          status: "PENDING",
        },
      });
      if (existing) {
        throw new ConflictException("A pending invite to this player already exists");
      }
    }

    const request = await this.prisma.matchRequest.create({
      data: {
        senderId,
        receiverId: dto.receiverId ?? null,
        teamId: dto.teamId ?? null,
        type,
        status: "PENDING",
        message: dto.message,
      },
      include: {
        sender: { select: { id: true, displayName: true } },
        receiver: { select: { id: true, displayName: true } },
        team: { select: { id: true, name: true } },
      },
    });

    return { request };
  }

  async findAll(userId: string, direction?: string) {
    const where: Record<string, unknown> = {};

    if (direction === "sent") {
      where.senderId = userId;
    } else if (direction === "received") {
      where.receiverId = userId;
    } else {
      where.OR = [{ senderId: userId }, { receiverId: userId }];
    }

    const requests = await this.prisma.matchRequest.findMany({
      where,
      include: {
        sender: { select: { id: true, displayName: true } },
        receiver: { select: { id: true, displayName: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { requests };
  }

  async accept(requestId: string, userId: string) {
    const request = await this.prisma.matchRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException("Request not found");
    if (request.status !== "PENDING") {
      throw new BadRequestException(`Cannot accept a ${request.status.toLowerCase()} request`);
    }

    const isReceiver = request.receiverId === userId;
    const isTeamCaptain = await this.isTeamCaptain(request.teamId, userId);
    if (!isReceiver && !isTeamCaptain) {
      throw new ForbiddenException("Only the receiver or team captain can accept");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.matchRequest.update({
        where: { id: requestId },
        data: { status: "ACCEPTED" as MatchRequestStatus },
        include: {
          sender: { select: { id: true, displayName: true } },
          receiver: { select: { id: true, displayName: true } },
          team: { select: { id: true, name: true } },
        },
      });

      const participantIds = [request.senderId];
      if (request.receiverId) participantIds.push(request.receiverId);

      const conversation = await tx.conversation.create({
        data: {
          matchRequestId: requestId,
          participants: {
            create: participantIds.map((uid) => ({ userId: uid })),
          },
        },
        include: {
          participants: true,
        },
      });

      return { ...updatedRequest, conversationId: conversation.id };
    });

    return { request: updated };
  }

  async decline(requestId: string, userId: string) {
    const request = await this.prisma.matchRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException("Request not found");
    if (request.status !== "PENDING") {
      throw new BadRequestException(`Cannot decline a ${request.status.toLowerCase()} request`);
    }

    const isReceiver = request.receiverId === userId;
    const isTeamCaptain = await this.isTeamCaptain(request.teamId, userId);
    if (!isReceiver && !isTeamCaptain) {
      throw new ForbiddenException("Only the receiver or team captain can decline");
    }

    const updated = await this.prisma.matchRequest.update({
      where: { id: requestId },
      data: { status: "DECLINED" as MatchRequestStatus },
      include: {
        sender: { select: { id: true, displayName: true } },
        receiver: { select: { id: true, displayName: true } },
        team: { select: { id: true, name: true } },
      },
    });

    return { request: updated };
  }

  async cancel(requestId: string, userId: string) {
    const request = await this.prisma.matchRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException("Request not found");
    if (request.senderId !== userId) {
      throw new ForbiddenException("Only the sender can cancel a request");
    }
    if (request.status !== "PENDING") {
      throw new BadRequestException(`Cannot cancel a ${request.status.toLowerCase()} request`);
    }

    const updated = await this.prisma.matchRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED" as MatchRequestStatus },
      include: {
        sender: { select: { id: true, displayName: true } },
        receiver: { select: { id: true, displayName: true } },
        team: { select: { id: true, name: true } },
      },
    });

    return { request: updated };
  }

  private async ensureNotBlocked(userId: string, targetId: string) {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: targetId },
          { blockerId: targetId, blockedId: userId },
        ],
      },
    });
    if (block) {
      throw new ForbiddenException("Cannot send request to this user");
    }
  }

  private async isTeamCaptain(
    teamId: string | null,
    userId: string,
  ): Promise<boolean> {
    if (!teamId) return false;
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { captainId: true },
    });
    return team?.captainId === userId;
  }
}

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { GameId } from "@fpt-esporthub/database";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCoachProfileDto } from "./dto/create-coach-profile.dto";
import { CreateCoachingRequestDto } from "./dto/create-coaching-request.dto";
import { CounterCoachingRequestDto } from "./dto/counter-coaching-request.dto";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";

@Injectable()
export class CoachingService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const coaches = await this.prisma.coachProfile.findMany({
      where: { active: true },
      include: { user: { select: { id: true, displayName: true, profile: { select: { rankTier: true, rankLevel: true, reputationBadge: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return { coaches };
  }

  async findOne(coachId: string) {
    const coach = await this.prisma.coachProfile.findUnique({
      where: { id: coachId },
      include: {
        user: { select: { id: true, displayName: true, profile: { select: { rankTier: true, rankLevel: true, reputationBadge: true, bio: true, riotId: true, verificationStatus: true } } } },
        feedbacks: { include: { player: { select: { id: true, displayName: true } } }, orderBy: { createdAt: "desc" } },
        requests: { where: { status: "AGREED" }, select: { id: true } },
      },
    });
    if (!coach) throw new NotFoundException("Coach not found");
    return { coach };
  }

  async createFeedback(userId: string, coachId: string, dto: CreateFeedbackDto) {
    const coach = await this.prisma.coachProfile.findFirst({ where: { id: coachId, active: true } });
    if (!coach) throw new NotFoundException("Coach not found");
    if (coach.userId === userId) throw new BadRequestException("Cannot review yourself");
    const feedback = await this.prisma.coachFeedback.create({
      data: { coachId, playerId: userId, rating: dto.rating, comment: dto.comment },
    });
    return { feedback };
  }

  async createProfile(userId: string, dto: CreateCoachProfileDto) {
    const game = dto.game as GameId;
    if (!Object.values(GameId).includes(game)) throw new BadRequestException("Unsupported game");
    const coach = await this.prisma.coachProfile.upsert({
      where: { userId },
      create: { userId, game, specialties: dto.specialties, hourlyRate: dto.hourlyRate, bio: dto.bio, availability: dto.availability },
      update: { game, specialties: dto.specialties, hourlyRate: dto.hourlyRate, bio: dto.bio, availability: dto.availability, active: true },
      include: { user: { select: { id: true, displayName: true } } },
    });
    return { coach };
  }

  async findRequests(userId: string) {
    const requests = await this.prisma.coachingRequest.findMany({
      where: { OR: [{ playerId: userId }, { coach: { userId } }] },
      include: { coach: { include: { user: { select: { id: true, displayName: true } } } }, player: { select: { id: true, displayName: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return { requests };
  }

  async createRequest(playerId: string, dto: CreateCoachingRequestDto) {
    const coach = await this.prisma.coachProfile.findFirst({ where: { id: dto.coachId, active: true } });
    if (!coach) throw new NotFoundException("Coach not found");
    if (coach.userId === playerId) throw new BadRequestException("Cannot hire yourself");
    const request = await this.prisma.coachingRequest.create({
      data: { coachId: coach.id, playerId, proposedStartAt: new Date(dto.proposedStartAt), durationMinutes: dto.durationMinutes, proposedPrice: dto.proposedPrice, message: dto.message, lastProposedById: playerId },
    });
    return { request };
  }

  async counter(requestId: string, userId: string, dto: CounterCoachingRequestDto) {
    const request = await this.getParticipantRequest(requestId, userId);
    if (request.status === "AGREED" || request.status === "DECLINED" || request.status === "CANCELLED") throw new BadRequestException("Request is closed");
    const updated = await this.prisma.coachingRequest.update({
      where: { id: requestId },
      data: { proposedStartAt: new Date(dto.proposedStartAt), durationMinutes: dto.durationMinutes, proposedPrice: dto.proposedPrice, message: dto.message, lastProposedById: userId, status: "COUNTERED" },
    });
    return { request: updated };
  }

  async agree(requestId: string, userId: string) {
    const request = await this.getParticipantRequest(requestId, userId);
    if (request.status === "AGREED" || request.status === "DECLINED" || request.status === "CANCELLED") throw new BadRequestException("Request is closed");
    if (request.lastProposedById === userId) throw new BadRequestException("Waiting for the other party to confirm this proposal");
    const updated = await this.prisma.coachingRequest.update({ where: { id: requestId }, data: { status: "AGREED" } });
    return { request: updated };
  }

  async cancel(requestId: string, userId: string) {
    await this.getParticipantRequest(requestId, userId);
    const updated = await this.prisma.coachingRequest.update({ where: { id: requestId }, data: { status: "CANCELLED" } });
    return { request: updated };
  }

  private async getParticipantRequest(requestId: string, userId: string) {
    const request = await this.prisma.coachingRequest.findUnique({ where: { id: requestId }, include: { coach: true } });
    if (!request) throw new NotFoundException("Coaching request not found");
    if (request.playerId !== userId && request.coach.userId !== userId) throw new ForbiddenException("Not a participant in this request");
    return request;
  }
}

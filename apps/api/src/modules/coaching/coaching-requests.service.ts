import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCoachingRequestDto } from "./dto/create-coaching-request.dto";
import { CounterCoachingRequestDto } from "./dto/counter-coaching-request.dto";
import { computeActions, toRequestView } from "./coaching.mappers";
import { creditsCoachingEnabled } from "../credits/credit-pricing";
import { CoachingSettlementService } from "./coaching-settlement.service";

const REQUEST_INCLUDE = {
  coach: { select: { userId: true, game: true, hourlyRate: true, user: { select: { id: true, displayName: true } } } },
  player: { select: { id: true, displayName: true } },
};

function assertFuture(value: string, now: Date) {
  const start = new Date(value);
  if (!(start > now)) throw new BadRequestException("Start time must be in the future");
  return start;
}

function assertAllowed(allowed: boolean, message: string) {
  if (!allowed) throw new BadRequestException(message);
}

@Injectable()
export class CoachingRequestsService {
  constructor(
    private prisma: PrismaService,
    private settlement: CoachingSettlementService,
  ) {}

  async findAll(userId: string) {
    await this.settlement.settleDue();
    const now = new Date();
    const requests = await this.prisma.coachingRequest.findMany({
      where: { OR: [{ playerId: userId }, { coach: { userId } }] },
      include: REQUEST_INCLUDE,
      orderBy: { updatedAt: "desc" },
    });
    const views = requests.map((request) => toRequestView(request, userId, now));
    return {
      asPlayer: views.filter((view) => view.viewerRole === "player"),
      asCoach: views.filter((view) => view.viewerRole === "coach"),
    };
  }

  async create(playerId: string, dto: CreateCoachingRequestDto) {
    const now = new Date();
    const coach = await this.prisma.coachProfile.findFirst({ where: { id: dto.coachId, active: true, reviewStatus: "APPROVED" }, select: { id: true, userId: true } });
    if (!coach) throw new NotFoundException("Coach not found");
    if (coach.userId === playerId) throw new BadRequestException("Cannot book yourself");
    const proposedStartAt = assertFuture(dto.proposedStartAt, now);
    const open = await this.prisma.coachingRequest.count({
      where: { coachId: coach.id, playerId, status: { in: ["PENDING", "COUNTERED"] } },
    });
    if (open) throw new BadRequestException("You already have an open request with this coach");
    const request = await this.prisma.coachingRequest.create({
      data: {
        coachId: coach.id,
        playerId,
        proposedStartAt,
        durationMinutes: dto.durationMinutes,
        proposedPrice: dto.proposedPrice,
        message: dto.message.trim(),
        lastProposedById: playerId,
      },
      include: REQUEST_INCLUDE,
    });
    return { request: toRequestView(request, playerId, now) };
  }

  async counter(requestId: string, userId: string, dto: CounterCoachingRequestDto) {
    const now = new Date();
    const request = await this.getParticipantRequest(requestId, userId);
    assertAllowed(computeActions(request, userId, now).canCounter, "Waiting for the other side to respond");
    const updated = await this.prisma.coachingRequest.update({
      where: { id: requestId },
      data: {
        proposedStartAt: assertFuture(dto.proposedStartAt, now),
        durationMinutes: dto.durationMinutes,
        proposedPrice: dto.proposedPrice,
        message: dto.message.trim(),
        lastProposedById: userId,
        status: "COUNTERED",
      },
      include: REQUEST_INCLUDE,
    });
    return { request: toRequestView(updated, userId, now) };
  }

  agree(requestId: string, userId: string) {
    return this.transition(requestId, userId, "AGREED", "canAgree", "This proposal cannot be agreed to");
  }

  decline(requestId: string, userId: string) {
    return this.transition(requestId, userId, "DECLINED", "canDecline", "Only the coach can decline an open request");
  }

  cancel(requestId: string, userId: string) {
    return this.transition(requestId, userId, "CANCELLED", "canCancel", "This request cannot be cancelled");
  }

  private async transition(
    requestId: string,
    userId: string,
    status: "AGREED" | "DECLINED" | "CANCELLED",
    flag: "canAgree" | "canDecline" | "canCancel",
    message: string,
  ) {
    const now = new Date();
    const request = await this.getParticipantRequest(requestId, userId);
    assertAllowed(computeActions(request, userId, now)[flag], message);
    // Held credits always settle, even if the flag was turned off after the session was agreed.
    if ((creditsCoachingEnabled() && status === "AGREED") || request.settlement) return this.transitionWithCredits(request, userId, status, now);
    const updated = await this.prisma.coachingRequest.update({ where: { id: requestId }, data: { status }, include: REQUEST_INCLUDE });
    return { request: toRequestView(updated, userId, now) };
  }

  /** Agreeing holds the player's credits, cancelling an agreed session refunds them; both or neither happen. */
  private async transitionWithCredits(
    request: Awaited<ReturnType<CoachingRequestsService["getParticipantRequest"]>>,
    userId: string,
    status: "AGREED" | "DECLINED" | "CANCELLED",
    now: Date,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const moved = await tx.coachingRequest.updateMany({ where: { id: request.id, status: request.status }, data: { status } });
      if (moved.count === 0) throw new BadRequestException("This request just changed. Refresh and try again.");
      if (status === "AGREED") await this.settlement.hold(tx, request, userId === request.playerId);
      if (status === "CANCELLED") await this.settlement.refund(tx, request);
    });
    const updated = await this.prisma.coachingRequest.findUniqueOrThrow({ where: { id: request.id }, include: REQUEST_INCLUDE });
    return { request: toRequestView(updated, userId, now) };
  }

  async confirmSession(requestId: string, userId: string) {
    await this.settlement.confirm(requestId, userId);
    return this.viewOf(requestId, userId);
  }

  async disputeSession(requestId: string, userId: string) {
    await this.settlement.dispute(requestId, userId);
    return this.viewOf(requestId, userId);
  }

  private async viewOf(requestId: string, userId: string) {
    const request = await this.getParticipantRequest(requestId, userId);
    return { request: toRequestView(request, userId, new Date()) };
  }

  private async getParticipantRequest(requestId: string, userId: string) {
    const request = await this.prisma.coachingRequest.findUnique({ where: { id: requestId }, include: REQUEST_INCLUDE });
    if (!request) throw new NotFoundException("Coaching request not found");
    if (request.playerId !== userId && request.coach.userId !== userId) throw new ForbiddenException("Not a participant in this request");
    return request;
  }
}

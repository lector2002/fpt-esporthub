import { randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import type { Prisma } from "@fpt-esporthub/database";
import { creditsForVnd } from "../credits/credit-pricing";
import { CreditsService } from "../credits/credits.service";
import { PrismaService } from "../prisma/prisma.service";

/** After a session ends the player has this long to report a problem before the coach is paid. */
export const DISPUTE_WINDOW_MS = 24 * 60 * 60 * 1000;
const SETTLE_EVERY_MS = 10 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

type Tx = Prisma.TransactionClient;

interface HeldSession {
  id: string;
  playerId: string;
  coachId: string;
  creditHold: number | null;
}

export function sessionEnd(request: { proposedStartAt: Date; durationMinutes: number }) {
  return new Date(request.proposedStartAt.getTime() + request.durationMinutes * MINUTE_MS);
}

/**
 * Escrow: credits leave the player when a session is agreed, go to the coach's payable balance once it is done
 * (player confirms, or the dispute window passes), and go back to the player on cancel or an upheld dispute.
 * Every move is keyed by the request id, so retries and the background sweep can't pay twice.
 */
@Injectable()
export class CoachingSettlementService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CoachingSettlementService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private credits: CreditsService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.settleDue().catch((error: Error) => this.logger.warn(`Settlement sweep failed: ${error.message}`)), SETTLE_EVERY_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Inside the AGREED transition. Throws ConflictException when the player is short. */
  async hold(tx: Tx, request: { id: string; playerId: string; proposedPrice: number }, agreedByPlayer: boolean) {
    const amount = creditsForVnd(request.proposedPrice);
    if (amount === 0) return;
    try {
      await this.credits.apply({ userId: request.playerId, amount: -amount, kind: "COACHING_HOLD", ref: `coaching-hold:${request.id}`, note: "Coaching session" }, tx);
    } catch (error) {
      if (error instanceof ConflictException && !agreedByPlayer) throw new ConflictException(`The player needs ${amount} credits to confirm this session`);
      throw error;
    }
    await tx.coachingRequest.update({ where: { id: request.id }, data: { creditHold: amount, settlement: "HELD" } });
  }

  /** After a transaction that held or refunded the player's credits. */
  notifyPlayer(playerId: string) {
    this.credits.notifyBalance(playerId);
  }

  /** Inside the CANCELLED transition of an agreed session. */
  async refund(tx: Tx, request: HeldSession) {
    if (!request.creditHold) return;
    const marked = await tx.coachingRequest.updateMany({
      where: { id: request.id, settlement: { in: ["HELD", "DISPUTED"] } },
      data: { settlement: "REFUNDED", settledAt: new Date() },
    });
    if (marked.count === 0) return;
    await this.credits.apply({ userId: request.playerId, amount: request.creditHold, kind: "COACHING_REFUND", ref: `coaching-refund:${request.id}`, note: "Coaching session refunded" }, tx);
  }

  private async release(tx: Tx, request: HeldSession) {
    if (!request.creditHold) return;
    const marked = await tx.coachingRequest.updateMany({
      where: { id: request.id, settlement: { in: ["HELD", "DISPUTED"] } },
      data: { settlement: "RELEASED", settledAt: new Date() },
    });
    if (marked.count === 0) return;
    await tx.coachPayoutEntry.create({
      data: { coachProfileId: request.coachId, amount: request.creditHold, kind: "EARNING", ref: `coaching-earning:${request.id}`, note: "Coaching session" },
    });
    await tx.coachProfile.update({ where: { id: request.coachId }, data: { payableCredits: { increment: request.creditHold } } });
  }

  /** The player says the session happened: pay the coach now instead of waiting for the window. */
  async confirm(requestId: string, playerId: string) {
    const request = await this.findHeld(requestId, playerId);
    if (request.proposedStartAt > new Date()) throw new BadRequestException("The session hasn't started yet");
    await this.prisma.$transaction((tx) => this.release(tx, request));
  }

  /** The player reports a problem before the coach is paid; an admin then releases or refunds. */
  async dispute(requestId: string, playerId: string) {
    const request = await this.findHeld(requestId, playerId);
    if (request.proposedStartAt > new Date()) throw new BadRequestException("Cancel instead: the session hasn't started yet");
    await this.prisma.coachingRequest.updateMany({ where: { id: requestId, settlement: "HELD" }, data: { settlement: "DISPUTED" } });
  }

  async resolveDispute(requestId: string, outcome: "release" | "refund") {
    const request = await this.prisma.coachingRequest.findUnique({ where: { id: requestId } });
    if (!request || request.settlement !== "DISPUTED") throw new NotFoundException("No open dispute for this session");
    await this.prisma.$transaction((tx) => (outcome === "release" ? this.release(tx, request) : this.refund(tx, request)));
    if (outcome === "refund") this.notifyPlayer(request.playerId);
    return { settlement: outcome === "release" ? "RELEASED" : "REFUNDED" };
  }

  /** Releases every undisputed session whose dispute window has passed. */
  async settleDue(now = new Date()) {
    const held = await this.prisma.coachingRequest.findMany({
      where: { status: "AGREED", settlement: "HELD", proposedStartAt: { lt: now } },
      select: { id: true, playerId: true, coachId: true, creditHold: true, proposedStartAt: true, durationMinutes: true },
    });
    const due = held.filter((request) => sessionEnd(request).getTime() + DISPUTE_WINDOW_MS <= now.getTime());
    for (const request of due) await this.prisma.$transaction((tx) => this.release(tx, request));
    return due.length;
  }

  /** Coaches with credits waiting to be paid out, plus sessions waiting on an admin decision. */
  async adminOverview() {
    const [coaches, disputes] = await Promise.all([
      this.prisma.coachProfile.findMany({
        where: { payableCredits: { gt: 0 } },
        select: { id: true, payableCredits: true, user: { select: { id: true, displayName: true, email: true } } },
        orderBy: { payableCredits: "desc" },
      }),
      this.prisma.coachingRequest.findMany({
        where: { settlement: "DISPUTED" },
        select: {
          id: true,
          creditHold: true,
          proposedStartAt: true,
          durationMinutes: true,
          player: { select: { id: true, displayName: true } },
          coach: { select: { id: true, user: { select: { displayName: true } } } },
        },
        orderBy: { proposedStartAt: "asc" },
      }),
    ]);
    return { coaches, disputes };
  }

  /** Records money the admin sent to the coach outside the app. */
  async recordPayout(coachProfileId: string, amount: number, note: string, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.coachProfile.updateMany({ where: { id: coachProfileId, payableCredits: { gte: amount } }, data: { payableCredits: { decrement: amount } } });
      if (updated.count === 0) throw new ConflictException("Payout is more than the coach's payable credits");
      await tx.coachPayoutEntry.create({
        data: { coachProfileId, amount: -amount, kind: "PAYOUT", ref: `payout:${randomUUID()}`, note: `${note.trim()} (by ${adminId})` },
      });
      const coach = await tx.coachProfile.findUniqueOrThrow({ where: { id: coachProfileId }, select: { payableCredits: true } });
      return { payableCredits: coach.payableCredits };
    });
  }

  private async findHeld(requestId: string, playerId: string) {
    const request = await this.prisma.coachingRequest.findUnique({ where: { id: requestId } });
    if (!request || request.playerId !== playerId) throw new NotFoundException("Coaching request not found");
    if (request.status !== "AGREED" || request.settlement !== "HELD") throw new BadRequestException("Nothing is waiting to be paid for this session");
    return request;
  }
}

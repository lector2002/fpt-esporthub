import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { GameId } from "@fpt-esporthub/database";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TournamentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(game?: string) {
    const where: { game?: GameId } = {};

    if (game) {
      const gameId = game.toUpperCase().replace(/ /g, "_") as GameId;
      where.game = gameId;
    }

    const events = await this.prisma.tournamentEvent.findMany({
      where,
      include: {
        _count: { select: { interests: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    return { events };
  }

  async findOne(eventId: string, userId?: string) {
    const event = await this.prisma.tournamentEvent.findUnique({
      where: { id: eventId },
      include: {
        interests: {
          include: {
            user: { select: { id: true, displayName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!event) throw new NotFoundException("Event not found");

    const interested = userId
      ? event.interests.some((i) => i.userId === userId)
      : false;

    return {
      event: {
        ...event,
        interestedCount: event.interests.length,
        interested,
        interests: event.interests.map((i) => i.user),
      },
    };
  }

  async addInterest(eventId: string, userId: string) {
    const event = await this.prisma.tournamentEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) throw new NotFoundException("Event not found");

    const existing = await this.prisma.tournamentEventInterest.findUnique({
      where: {
        eventId_userId: { eventId, userId },
      },
    });

    if (existing) {
      throw new ConflictException("Already interested in this event");
    }

    const interest = await this.prisma.tournamentEventInterest.create({
      data: { eventId, userId },
    });

    return { interest };
  }

  async removeInterest(eventId: string, userId: string) {
    const existing = await this.prisma.tournamentEventInterest.findUnique({
      where: {
        eventId_userId: { eventId, userId },
      },
    });

    if (!existing) {
      throw new NotFoundException("Interest not found");
    }

    await this.prisma.tournamentEventInterest.delete({
      where: {
        eventId_userId: { eventId, userId },
      },
    });

    return { success: true };
  }
}

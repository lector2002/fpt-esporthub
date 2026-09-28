import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { VenueStatus } from "@fpt-esporthub/database";
import { toGameSlug } from "../../common/game";
import { PrismaService } from "../prisma/prisma.service";
import type { ApplyVenueDto, ReviewVenueDto } from "./dto/venue.dto";

const CUP_LIST_LIMIT = 30;

@Injectable()
export class VenuesService {
  constructor(private prisma: PrismaService) {}

  getMine(userId: string) {
    return this.prisma.venue.findUnique({ where: { ownerId: userId } });
  }

  /** New application, or a resubmission after a rejection. Approved venues are not re-reviewed. */
  async apply(userId: string, dto: ApplyVenueDto) {
    const existing = await this.getMine(userId);
    if (existing?.status === "APPROVED") throw new ConflictException("Your venue is already approved");
    const data = { name: dto.name, address: dto.address, city: dto.city, pcCount: dto.pcCount, phone: dto.phone ?? null };
    return this.prisma.venue.upsert({
      where: { ownerId: userId },
      create: { ownerId: userId, ...data },
      update: { ...data, status: "PENDING", reviewNote: null, reviewedAt: null },
    });
  }

  /** The caller's venue, which must be approved to host. */
  async requireApproved(userId: string) {
    const venue = await this.getMine(userId);
    if (venue?.status !== "APPROVED") throw new ForbiddenException("Only approved venues can host tournaments");
    return venue;
  }

  listForAdmin(status: VenueStatus | undefined) {
    return this.prisma.venue.findMany({
      where: status ? { status } : undefined,
      include: { owner: { select: { id: true, displayName: true, email: true } }, _count: { select: { tournaments: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
  }

  /** One venue for the admin: owner, application, and the cups it hosted with entries and fees paid at the counter. */
  async getForAdmin(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: { owner: { select: { id: true, displayName: true, avatarKey: true, email: true, status: true } } },
    });
    if (!venue) throw new NotFoundException("Venue not found");
    const [tournaments, paid] = await Promise.all([
      this.prisma.tournament.findMany({
        where: { venueId: id },
        select: { id: true, title: true, game: true, status: true, startsAt: true, entryFee: true, maxTeams: true, _count: { select: { entries: true } } },
        orderBy: { startsAt: "desc" },
      }),
      this.prisma.tournamentEntry.groupBy({ by: ["tournamentId"], where: { paidAt: { not: null }, tournament: { venueId: id } }, _count: true }),
    ]);
    const paidBy = new Map(paid.map((row) => [row.tournamentId, row._count]));
    const cups = tournaments.map(({ _count, game, ...cup }) => ({
      ...cup,
      game: toGameSlug(game),
      entries: _count.entries,
      paidEntries: paidBy.get(cup.id) ?? 0,
    }));
    return {
      venue,
      cups: cups.slice(0, CUP_LIST_LIMIT),
      totals: {
        cups: cups.length,
        entries: cups.reduce((sum, cup) => sum + cup.entries, 0),
        feesCollected: cups.reduce((sum, cup) => sum + cup.paidEntries * cup.entryFee, 0),
      },
      listLimit: CUP_LIST_LIMIT,
    };
  }

  async review(id: string, dto: ReviewVenueDto) {
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue) throw new NotFoundException("Venue not found");
    return this.prisma.venue.update({
      where: { id },
      data: { status: dto.status, reviewNote: dto.note ?? null, reviewedAt: new Date() },
    });
  }
}

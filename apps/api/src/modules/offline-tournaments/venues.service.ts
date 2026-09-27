import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { VenueStatus } from "@fpt-esporthub/database";
import { PrismaService } from "../prisma/prisma.service";
import type { ApplyVenueDto, ReviewVenueDto } from "./dto/venue.dto";

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

  async review(id: string, dto: ReviewVenueDto) {
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue) throw new NotFoundException("Venue not found");
    return this.prisma.venue.update({
      where: { id },
      data: { status: dto.status, reviewNote: dto.note ?? null, reviewedAt: new Date() },
    });
  }
}

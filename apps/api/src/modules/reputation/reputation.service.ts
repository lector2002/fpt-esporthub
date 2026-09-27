import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type Badge = "NEW" | "VERIFIED" | "TRUSTED" | "CAUTION";

const CAUTION_WINDOW_DAYS = 90;
const TRUSTED_MIN_POINTS = 5;

@Injectable()
export class ReputationService {
  constructor(private prisma: PrismaService) {}

  /**
   * CAUTION: a RESOLVED report against the user in the last 90 days, or status WARNED/RESTRICTED.
   * TRUSTED: a Riot VERIFIED game profile and >= 5 positive reputation points.
   * VERIFIED: a Riot VERIFIED game profile. NEW otherwise.
   */
  async computeBadge(userId: string): Promise<Badge> {
    if (await this.needsCaution(userId)) return "CAUTION";

    const verified = await this.prisma.playerProfile.count({
      where: { userId, verificationStatus: "VERIFIED" },
    });
    if (verified === 0) return "NEW";

    const positive = await this.prisma.reputationRecord.aggregate({
      where: { userId, points: { gt: 0 } },
      _sum: { points: true },
    });
    return (positive._sum.points ?? 0) >= TRUSTED_MIN_POINTS ? "TRUSTED" : "VERIFIED";
  }

  async updateBadge(userId: string): Promise<Badge> {
    const badge = await this.computeBadge(userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { reputationBadge: badge },
    });
    return badge;
  }

  /** Store a reputation event, then recompute the user's badge. */
  async recordEvent(userId: string, type: string, points: number, note?: string): Promise<Badge> {
    await this.prisma.reputationRecord.create({
      data: { userId, type, points, note: note ?? null },
    });
    return this.updateBadge(userId);
  }

  private async needsCaution(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (user?.status === "WARNED" || user?.status === "RESTRICTED") return true;

    const since = new Date(Date.now() - CAUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const recentResolved = await this.prisma.report.count({
      where: {
        reportedUserId: userId,
        status: "RESOLVED",
        OR: [{ resolvedAt: { gte: since } }, { resolvedAt: null, createdAt: { gte: since } }],
      },
    });
    return recentResolved > 0;
  }
}

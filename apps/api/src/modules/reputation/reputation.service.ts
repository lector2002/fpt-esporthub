import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReputationService {
  constructor(private prisma: PrismaService) {}

  async computeBadge(userId: string): Promise<string> {
    const profile = await this.prisma.playerProfile.findUnique({
      where: { userId },
    });

    if (!profile) return "NEW";

    if (
      profile.verificationStatus === "SUSPENDED"
    ) {
      return "CAUTION";
    }

    const resolvedReports = await this.prisma.report.count({
      where: {
        reportedUserId: userId,
        status: "RESOLVED",
      },
    });

    if (resolvedReports > 0) {
      return "CAUTION";
    }

    if (profile.verificationStatus === "VERIFIED") {
      return "VERIFIED";
    }

    const totalRecords = await this.prisma.reputationRecord.count({
      where: { userId },
    });

    if (totalRecords >= 5) {
      return "TRUSTED";
    }

    if (profile.verificationStatus === "SELF_REPORTED") {
      return "VERIFIED";
    }

    return "NEW";
  }

  async getReputationDetail(userId: string) {
    const profile = await this.prisma.playerProfile.findUnique({
      where: { userId },
    });

    const records = await this.prisma.reputationRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const reportCount = await this.prisma.report.count({
      where: { reportedUserId: userId },
    });

    const resolvedReportCount = await this.prisma.report.count({
      where: { reportedUserId: userId, status: "RESOLVED" },
    });

    const totalPoints = records.reduce((sum, r) => sum + r.points, 0);
    const badge = await this.computeBadge(userId);

    return {
      badge,
      totalPoints,
      verificationStatus: profile?.verificationStatus ?? "UNVERIFIED",
      reportCount,
      resolvedReportCount,
      recordCount: records.length,
    };
  }

  async updateBadge(userId: string): Promise<string> {
    const badge = await this.computeBadge(userId);

    await this.prisma.playerProfile.update({
      where: { userId },
      data: { reputationBadge: badge as "NEW" | "VERIFIED" | "TRUSTED" | "CAUTION" },
    });

    return badge;
  }
}

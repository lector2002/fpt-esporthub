import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ReputationService } from "../reputation/reputation.service";

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private reputationService: ReputationService,
  ) {}

  async getUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          status: true,
          createdAt: true,
          profile: {
            select: {
              game: true,
              rankTier: true,
              reputationBadge: true,
              verificationStatus: true,
              onboardingComplete: true,
            },
          },
          _count: {
            select: {
              reportsFiled: true,
              reportsReceived: true,
              blocksMade: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count(),
    ]);

    return { users, total, page, limit };
  }

  async getTeams(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [teams, total] = await Promise.all([
      this.prisma.team.findMany({
        skip,
        take: limit,
        include: {
          captain: { select: { id: true, displayName: true, email: true } },
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.team.count(),
    ]);

    return { teams, total, page, limit };
  }

  async getReports(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as "PENDING" | "REVIEWING" | "RESOLVED" | "DISMISSED" } : {};

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        include: {
          reporter: {
            select: { id: true, displayName: true, email: true },
          },
          reportedUser: {
            select: { id: true, displayName: true, email: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.report.count({ where }),
    ]);

    return { reports, total, page, limit };
  }

  async updateReport(reportId: string, status: string, resolution?: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) throw new NotFoundException("Report not found");

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: status as "PENDING" | "REVIEWING" | "RESOLVED" | "DISMISSED",
        resolvedAt: status === "RESOLVED" || status === "DISMISSED"
          ? new Date()
          : undefined,
      },
      include: {
        reporter: { select: { id: true, displayName: true } },
        reportedUser: { select: { id: true, displayName: true, status: true } },
      },
    });

    if (status === "RESOLVED" && report.reportedUserId) {
      await this.reputationService.updateBadge(report.reportedUserId);
    }

    return { report: updated };
  }

  async getTournaments(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      this.prisma.tournamentEvent.findMany({
        skip,
        take: limit,
        include: {
          _count: { select: { interests: true } },
        },
        orderBy: { startsAt: "asc" },
      }),
      this.prisma.tournamentEvent.count(),
    ]);

    return { events, total, page, limit };
  }

  async getMetrics() {
    const [
      totalUsers,
      activeUsers,
      totalTeams,
      totalReports,
      pendingReports,
      totalBlocks,
      totalEvents,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: "ACTIVE" } }),
      this.prisma.team.count(),
      this.prisma.report.count(),
      this.prisma.report.count({ where: { status: "PENDING" } }),
      this.prisma.block.count(),
      this.prisma.tournamentEvent.count(),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalTeams,
      totalReports,
      pendingReports,
      totalBlocks,
      totalEvents,
    };
  }
}

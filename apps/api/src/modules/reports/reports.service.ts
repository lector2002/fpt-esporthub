import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReportDto, ReportTargetType } from "./dto/create-report.dto";

const DAILY_REPORT_LIMIT = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

const REPORT_SELECT = {
  id: true,
  targetType: true,
  targetId: true,
  reason: true,
  description: true,
  status: true,
  createdAt: true,
  resolvedAt: true,
  reportedUser: { select: { id: true, displayName: true } },
} as const;

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async create(reporterId: string, dto: CreateReportDto) {
    await this.assertUnderDailyLimit(reporterId);

    const reportedUserId = await this.resolveReportedUser(reporterId, dto.targetType, dto.targetId);
    if (reportedUserId === reporterId) {
      throw new BadRequestException("You cannot report yourself");
    }

    const duplicate = await this.prisma.report.findFirst({
      where: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        status: { in: ["PENDING", "REVIEWING"] },
      },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException("You already reported this");

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        reportedUserId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        description: dto.details?.trim() || null,
      },
      select: REPORT_SELECT,
    });
    return { report: toReportView(report) };
  }

  async findMine(reporterId: string) {
    const reports = await this.prisma.report.findMany({
      where: { reporterId },
      select: REPORT_SELECT,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { reports: reports.map(toReportView) };
  }

  private async assertUnderDailyLimit(reporterId: string) {
    const recent = await this.prisma.report.count({
      where: { reporterId, createdAt: { gte: new Date(Date.now() - DAY_MS) } },
    });
    if (recent >= DAILY_REPORT_LIMIT) {
      throw new HttpException("Daily report limit reached. Try again tomorrow.", HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  /** Validates the target exists and returns the user responsible for it. */
  private async resolveReportedUser(reporterId: string, type: ReportTargetType, targetId: string) {
    if (type === "user") {
      const user = await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!user) throw new NotFoundException("User not found");
      return user.id;
    }

    if (type === "team") {
      const team = await this.prisma.team.findUnique({ where: { id: targetId }, select: { captainId: true } });
      if (!team) throw new NotFoundException("Team not found");
      return team.captainId;
    }

    const message = await this.prisma.message.findFirst({
      where: {
        id: targetId,
        conversation: { participants: { some: { userId: reporterId } } },
      },
      select: { senderId: true },
    });
    if (!message) throw new NotFoundException("Message not found");
    return message.senderId;
  }
}

type ReportRow = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  reportedUser: { id: string; displayName: string } | null;
};

function toReportView({ description, ...report }: ReportRow) {
  return { ...report, details: description };
}

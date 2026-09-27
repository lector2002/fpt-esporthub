import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ReputationService } from "../reputation/reputation.service";
import { findModeratableUser } from "./admin-moderation";
import { PAGE_SIZE, type ReportStatusValue, type UserStatusValue } from "./dto/admin-query.dto";
import type { ReportAction } from "./dto/update-report.dto";

const ACTION_STATUS: Record<Exclude<ReportAction, "none">, UserStatusValue> = {
  warn: "WARNED",
  restrict: "RESTRICTED",
  ban: "BANNED",
};

const PREVIEW_LENGTH = 280;

const REPORT_SELECT = {
  id: true,
  targetType: true,
  targetId: true,
  reason: true,
  description: true,
  status: true,
  createdAt: true,
  resolvedAt: true,
  reporter: { select: { id: true, displayName: true } },
  reportedUser: { select: { id: true, displayName: true, status: true, reputationBadge: true } },
} as const;

type TargetRef = { targetType: string; targetId: string };

@Injectable()
export class AdminReportsService {
  constructor(
    private prisma: PrismaService,
    private reputationService: ReputationService,
  ) {}

  async getReports(status: ReportStatusValue | undefined, page: number) {
    const where = status ? { status } : {};
    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        select: REPORT_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.report.count({ where }),
    ]);

    const previews = await this.loadPreviews(reports);
    const items = reports.map(({ description, ...report }) => ({
      ...report,
      details: description,
      targetPreview: previews.get(`${report.targetType}:${report.targetId}`) ?? null,
    }));
    return { items, total, page, pageSize: PAGE_SIZE };
  }

  async updateReport(
    actorId: string,
    reportId: string,
    status: "REVIEWING" | "RESOLVED" | "DISMISSED",
    action: ReportAction,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, reportedUserId: true },
    });
    if (!report) throw new NotFoundException("Report not found");

    if (action !== "none") {
      if (status !== "RESOLVED") {
        throw new BadRequestException("Actions can only be applied when resolving a report");
      }
      if (!report.reportedUserId) {
        throw new BadRequestException("This report has no reported user");
      }
      await findModeratableUser(this.prisma, actorId, report.reportedUserId);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (action !== "none" && report.reportedUserId) {
        await tx.user.update({ where: { id: report.reportedUserId }, data: { status: ACTION_STATUS[action] } });
      }
      return tx.report.update({
        where: { id: reportId },
        data: { status, resolvedAt: status === "REVIEWING" ? null : new Date() },
        select: { id: true, status: true, resolvedAt: true },
      });
    });

    if (report.reportedUserId) {
      await this.reputationService.updateBadge(report.reportedUserId);
    }
    return { report: updated };
  }

  /** One query per target type; keys are `${targetType}:${targetId}`. */
  private async loadPreviews(reports: TargetRef[]) {
    const idsOf = (type: string) => reports.filter((r) => r.targetType === type).map((r) => r.targetId);
    const [messages, teams, users] = await Promise.all([
      this.prisma.message.findMany({
        where: { id: { in: idsOf("message") } },
        select: { id: true, content: true, createdAt: true },
      }),
      this.prisma.team.findMany({ where: { id: { in: idsOf("team") } }, select: { id: true, name: true } }),
      this.prisma.user.findMany({ where: { id: { in: idsOf("user") } }, select: { id: true, displayName: true } }),
    ]);

    const previews = new Map<string, { label: string; createdAt?: Date }>();
    for (const message of messages) {
      previews.set(`message:${message.id}`, {
        label: message.content.slice(0, PREVIEW_LENGTH),
        createdAt: message.createdAt,
      });
    }
    for (const team of teams) previews.set(`team:${team.id}`, { label: team.name });
    for (const user of users) previews.set(`user:${user.id}`, { label: user.displayName });
    return previews;
  }
}

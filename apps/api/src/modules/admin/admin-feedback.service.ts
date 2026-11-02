import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@fpt-esporthub/database";
import { sqlDayKey, vnDayStart, vnDays } from "../../common/vn-day";
import { PrismaService } from "../prisma/prisma.service";
import { FEEDBACK_KINDS, type FeedbackKindValue } from "../feedback/dto/create-feedback.dto";
import { PAGE_SIZE, REPORT_STATUSES, type ReportStatusValue } from "./dto/admin-query.dto";

const TREND_DAYS = 30;
const TOP_PAGES = 5;
const OPEN = ["PENDING", "REVIEWING"] as const;

export interface FeedbackFilters {
  status?: ReportStatusValue;
  kind?: FeedbackKindValue;
  q?: string;
  path?: string;
}

const contains = (q: string) => ({ contains: q, mode: "insensitive" as const });
const tally = <K extends string>(keys: readonly K[], groups: { key: K; _count: number }[]) =>
  Object.fromEntries(keys.map((key) => [key, groups.find((group) => group.key === key)?._count ?? 0])) as Record<K, number>;

@Injectable()
export class AdminFeedbackService {
  constructor(private prisma: PrismaService) {}

  /** One page of feedback, counts per status and per kind under the other filters, a 30-day trend and the pages with most open items. */
  async getFeedback({ status, kind, q, path }: FeedbackFilters, page: number) {
    const search = q?.trim();
    const text: Prisma.FeedbackWhereInput = {
      ...(path ? { page: path } : {}),
      ...(search ? { OR: [{ message: contains(search) }, { page: contains(search) }, { user: { displayName: contains(search) } }] } : {}),
    };
    const byKind = kind ? { kind } : {};
    const byStatus = status ? { status } : {};
    const where = { ...text, ...byKind, ...byStatus };

    const [items, total, statusGroups, kindGroups, trend, topPages] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        select: { id: true, kind: true, message: true, page: true, status: true, adminNote: true, createdAt: true, resolvedAt: true, user: { select: { id: true, displayName: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.feedback.count({ where }),
      this.prisma.feedback.groupBy({ by: ["status"], where: { ...text, ...byKind }, _count: true }),
      this.prisma.feedback.groupBy({ by: ["kind"], where: { ...text, ...byStatus }, _count: true }),
      this.trend(),
      this.prisma.feedback.groupBy({
        by: ["page"],
        where: { status: { in: [...OPEN] }, page: { not: null } },
        _count: true,
        orderBy: { _count: { page: "desc" } },
        take: TOP_PAGES,
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize: PAGE_SIZE,
      counts: {
        status: tally(REPORT_STATUSES, statusGroups.map((group) => ({ key: group.status, _count: group._count }))),
        kind: tally(FEEDBACK_KINDS, kindGroups.map((group) => ({ key: group.kind, _count: group._count }))),
      },
      trend,
      topPages: topPages.map((group) => ({ page: group.page as string, open: group._count })),
    };
  }

  /** Feedback sent and closed (resolved or dismissed) per Vietnam day. */
  private async trend() {
    const since = vnDayStart(TREND_DAYS - 1);
    const rows = await this.prisma.$queryRaw<{ series: "created" | "closed"; day: Date; n: bigint }[]>`
      SELECT 'created' AS series, date_trunc('day', "createdAt" + interval '7 hours') AS day, COUNT(*)::bigint AS n FROM "Feedback" WHERE "createdAt" >= ${since} GROUP BY 2
      UNION ALL SELECT 'closed', date_trunc('day', "resolvedAt" + interval '7 hours'), COUNT(*)::bigint FROM "Feedback" WHERE "resolvedAt" >= ${since} GROUP BY 2`;
    const byKey = new Map(rows.map((row) => [`${row.series}:${sqlDayKey(row.day)}`, Number(row.n)]));
    return vnDays(since, TREND_DAYS).map((day) => ({ day, created: byKey.get(`created:${day}`) ?? 0, closed: byKey.get(`closed:${day}`) ?? 0 }));
  }

  /** Changes the status, the admin note, or both. An empty note clears it. */
  async updateFeedback(id: string, { status, note }: { status?: "REVIEWING" | "RESOLVED" | "DISMISSED"; note?: string }) {
    const found = await this.prisma.feedback.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException("Feedback not found");
    const feedback = await this.prisma.feedback.update({
      where: { id },
      data: {
        ...(status ? { status, resolvedAt: status === "REVIEWING" ? null : new Date() } : {}),
        ...(note !== undefined ? { adminNote: note || null } : {}),
      },
      select: { id: true, status: true, resolvedAt: true, adminNote: true },
    });
    return { feedback };
  }
}

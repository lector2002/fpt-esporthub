import { Injectable } from "@nestjs/common";
import type { CreditTxKind } from "@fpt-esporthub/database";
import { PrismaService } from "../prisma/prisma.service";
import { CREDIT_VND } from "../credits/credit-pricing";

export const FINANCE_PERIODS = [7, 30, 90] as const;
export type FinancePeriod = (typeof FINANCE_PERIODS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;
/** Days are counted in Vietnam time (UTC+7, no DST), so "today" matches what the admin sees. */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const SPEND_KINDS = ["BOOST", "FEATURE", "COSMETIC", "GUIDE"] as const satisfies readonly CreditTxKind[];

function vnDayKey(date: Date) {
  return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/** Start of the Vietnam day `daysAgo` days before today, as a UTC instant. */
function vnDayStart(daysAgo: number) {
  const today = vnDayKey(new Date());
  return new Date(Date.parse(`${today}T00:00:00Z`) - VN_OFFSET_MS - daysAgo * DAY_MS);
}

const sum = (value: number | null | undefined) => value ?? 0;

@Injectable()
export class AdminFinanceService {
  constructor(private prisma: PrismaService) {}

  async getFinance(days: FinancePeriod) {
    const since = vnDayStart(days - 1);
    const prevSince = vnDayStart(2 * days - 1);
    const paidIn = (from: Date, to?: Date) => ({ status: "PAID" as const, paidAt: { gte: from, ...(to ? { lt: to } : {}) } });

    const [revenue, prevRevenue, allTime, payingUsers, statusGroups, balances, spendGroups, adjustIn, adjustOut, coachingOwed, dailyRevenue, dailySpend, buyers, recent] =
      await Promise.all([
        this.prisma.creditTopUp.aggregate({ where: paidIn(since), _sum: { amountVnd: true, credits: true }, _count: true }),
        this.prisma.creditTopUp.aggregate({ where: paidIn(prevSince, since), _sum: { amountVnd: true } }),
        this.prisma.creditTopUp.aggregate({ where: { status: "PAID" }, _sum: { amountVnd: true }, _count: true }),
        this.prisma.creditTopUp.groupBy({ by: ["userId"], where: paidIn(since) }),
        this.prisma.creditTopUp.groupBy({ by: ["status"], where: { createdAt: { gte: since } }, _count: true }),
        this.prisma.creditTransaction.aggregate({ _sum: { amount: true } }),
        this.prisma.creditTransaction.groupBy({ by: ["kind"], where: { createdAt: { gte: since } }, _sum: { amount: true } }),
        this.prisma.creditTransaction.aggregate({ where: { kind: "ADJUSTMENT", amount: { gt: 0 }, createdAt: { gte: since } }, _sum: { amount: true } }),
        this.prisma.creditTransaction.aggregate({ where: { kind: "ADJUSTMENT", amount: { lt: 0 }, createdAt: { gte: since } }, _sum: { amount: true } }),
        this.prisma.coachProfile.aggregate({ _sum: { payableCredits: true } }),
        this.prisma.$queryRaw<{ day: Date; vnd: bigint; orders: bigint }[]>`
          SELECT date_trunc('day', "paidAt" + interval '7 hours') AS day, SUM("amountVnd")::bigint AS vnd, COUNT(*)::bigint AS orders
          FROM "CreditTopUp" WHERE status = 'PAID' AND "paidAt" >= ${since} GROUP BY 1`,
        this.prisma.$queryRaw<{ day: Date; credits: bigint }[]>`
          SELECT date_trunc('day', "createdAt" + interval '7 hours') AS day, SUM(-amount)::bigint AS credits
          FROM "CreditTransaction" WHERE amount < 0 AND kind <> 'ADJUSTMENT' AND "createdAt" >= ${since} GROUP BY 1`,
        this.prisma.creditTopUp.groupBy({
          by: ["userId"],
          where: paidIn(since),
          _sum: { amountVnd: true },
          _count: true,
          orderBy: { _sum: { amountVnd: "desc" } },
          take: 5,
        }),
        this.prisma.creditTopUp.findMany({
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            orderCode: true,
            credits: true,
            amountVnd: true,
            status: true,
            provider: true,
            createdAt: true,
            paidAt: true,
            user: { select: { id: true, displayName: true, avatarKey: true } },
          },
        }),
      ]);

    const kindSum = (kind: CreditTxKind) => sum(spendGroups.find((group) => group.kind === kind)?._sum.amount);
    const spent = {
      ...Object.fromEntries(SPEND_KINDS.map((kind) => [kind, -kindSum(kind)])),
      // A refund puts held credits back, so coaching counts only what was kept.
      COACHING: -(kindSum("COACHING_HOLD") + kindSum("COACHING_REFUND")),
    } as Record<(typeof SPEND_KINDS)[number] | "COACHING", number>;

    const revenueByDay = new Map(dailyRevenue.map((row) => [row.day.toISOString().slice(0, 10), row]));
    const spendByDay = new Map(dailySpend.map((row) => [row.day.toISOString().slice(0, 10), Number(row.credits)]));
    const daily = Array.from({ length: days }, (_, index) => {
      const day = vnDayKey(new Date(since.getTime() + index * DAY_MS));
      const row = revenueByDay.get(day);
      return { day, vnd: Number(row?.vnd ?? 0), orders: Number(row?.orders ?? 0), creditsUsed: spendByDay.get(day) ?? 0 };
    });

    const buyerUsers = await this.prisma.user.findMany({
      where: { id: { in: buyers.map((buyer) => buyer.userId) } },
      select: { id: true, displayName: true, avatarKey: true },
    });
    const topBuyers = buyers.flatMap((buyer) => {
      const user = buyerUsers.find((candidate) => candidate.id === buyer.userId);
      return user ? [{ user, vnd: sum(buyer._sum.amountVnd), orders: buyer._count }] : [];
    });

    const statusCount = (status: "PAID" | "PENDING" | "CANCELLED") => statusGroups.find((group) => group.status === status)?._count ?? 0;

    return {
      days,
      since: since.toISOString(),
      creditVnd: CREDIT_VND,
      revenue: {
        vnd: sum(revenue._sum.amountVnd),
        previousVnd: sum(prevRevenue._sum.amountVnd),
        orders: revenue._count,
        payingUsers: payingUsers.length,
        allTimeVnd: sum(allTime._sum.amountVnd),
        allTimeOrders: allTime._count,
      },
      orders: { paid: statusCount("PAID"), pending: statusCount("PENDING"), cancelled: statusCount("CANCELLED") },
      credits: {
        outstanding: sum(balances._sum.amount),
        sold: sum(revenue._sum.credits),
        granted: sum(adjustIn._sum.amount),
        removed: -sum(adjustOut._sum.amount),
        spent,
        coachingOwed: sum(coachingOwed._sum.payableCredits),
      },
      daily,
      topBuyers,
      recentTopUps: recent,
    };
  }
}

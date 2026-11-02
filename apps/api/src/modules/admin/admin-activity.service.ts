import { Injectable } from "@nestjs/common";
import { toGameSlug } from "../../common/game";
import { sqlDayKey, vnDayStart, vnDays } from "../../common/vn-day";
import { PrismaService } from "../prisma/prisma.service";
import type { FinancePeriod } from "./admin-finance.service";

const TOP = 5;
const SERIES = ["signups", "messages", "connections", "teams"] as const;
type Series = (typeof SERIES)[number];
const PLACES = ["direct", "team", "community"] as const;
type Place = (typeof PLACES)[number];
const USER_PICK = { id: true, displayName: true, avatarKey: true } as const;

type Row<T> = (T & { n: bigint })[];
const first = (rows: Row<object>) => Number(rows[0]?.n ?? 0);
// A request has no accepted-at time; its last update is the accept, since accepted requests are not edited again.
const accepted = (updatedAt: object) => ({ status: "ACCEPTED" as const, updatedAt });

@Injectable()
export class AdminActivityService {
  constructor(private prisma: PrismaService) {}

  async getActivity(days: FinancePeriod) {
    const since = vnDayStart(days - 1);
    const prevSince = vnDayStart(2 * days - 1);
    const [totals, daily, leaders] = await Promise.all([this.totals(since, prevSince), this.daily(since, days), this.leaders(since)]);
    return { days, since: since.toISOString(), ...totals, daily, ...leaders };
  }

  /**
   * "Active" = checked in (the app does it on the first visit of the day), sent a message or sent a request.
   * The app keeps no visit log, so these actions are the only trace of a visit.
   */
  private activeBetween(from: Date, to: Date) {
    return this.prisma.$queryRaw<Row<object>>`
      SELECT COUNT(DISTINCT uid)::bigint AS n FROM (
        SELECT "userId" AS uid FROM "CreditTransaction" WHERE kind = 'REWARD' AND ref LIKE 'checkin:%' AND "createdAt" >= ${from} AND "createdAt" < ${to}
        UNION ALL SELECT "senderId" FROM "Message" WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
        UNION ALL SELECT "senderId" FROM "MatchRequest" WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
      ) active`;
  }

  /** Period totals, the same totals for the period before (for the change), and what waits for an admin. */
  private async totals(since: Date, prevSince: Date) {
    const inPeriod = { gte: since };
    const inPrevious = { gte: prevSince, lt: since };
    const [usersNew, usersPrevious, onboarded, usersTotal, active, activePrevious, messages, messagesPrevious, places, made, madePrevious, sent, madeByType, teams, teamsPrevious, teamsByGame, reportsOpen, feedback] =
      await Promise.all([
        this.prisma.user.count({ where: { createdAt: inPeriod } }),
        this.prisma.user.count({ where: { createdAt: inPrevious } }),
        this.prisma.user.count({ where: { createdAt: inPeriod, profiles: { some: { onboardingComplete: true } } } }),
        this.prisma.user.count(),
        this.activeBetween(since, new Date()),
        this.activeBetween(prevSince, since),
        this.prisma.message.count({ where: { createdAt: inPeriod } }),
        this.prisma.message.count({ where: { createdAt: inPrevious } }),
        this.prisma.$queryRaw<Row<{ place: Place }>>`
          SELECT CASE WHEN c."channelId" IS NOT NULL THEN 'community' WHEN c."teamId" IS NOT NULL THEN 'team' ELSE 'direct' END AS place, COUNT(*)::bigint AS n
          FROM "Message" m JOIN "Conversation" c ON c.id = m."conversationId" WHERE m."createdAt" >= ${since} GROUP BY 1`,
        this.prisma.matchRequest.count({ where: accepted(inPeriod) }),
        this.prisma.matchRequest.count({ where: accepted(inPrevious) }),
        this.prisma.matchRequest.count({ where: { createdAt: inPeriod } }),
        this.prisma.matchRequest.groupBy({ by: ["type"], where: accepted(inPeriod), _count: true }),
        this.prisma.team.count({ where: { createdAt: inPeriod } }),
        this.prisma.team.count({ where: { createdAt: inPrevious } }),
        this.prisma.team.groupBy({ by: ["game"], where: { createdAt: inPeriod }, _count: true }),
        this.prisma.report.count({ where: { status: { in: ["PENDING", "REVIEWING"] } } }),
        this.prisma.feedback.groupBy({ by: ["status"], where: { status: { in: ["PENDING", "REVIEWING"] } }, _count: true }),
      ]);

    const playerMade = madeByType.find((group) => group.type === "PLAYER_TO_PLAYER")?._count ?? 0;
    const feedbackCount = (status: "PENDING" | "REVIEWING") => feedback.find((group) => group.status === status)?._count ?? 0;
    return {
      users: { new: usersNew, previous: usersPrevious, onboarded, total: usersTotal },
      active: { users: first(active), previous: first(activePrevious) },
      messages: {
        total: messages,
        previous: messagesPrevious,
        byPlace: Object.fromEntries(PLACES.map((place) => [place, Number(places.find((row) => row.place === place)?.n ?? 0)])) as Record<Place, number>,
      },
      connections: { made, previous: madePrevious, requestsSent: sent, players: playerMade, teams: made - playerMade },
      teams: { created: teams, previous: teamsPrevious, byGame: Object.fromEntries(teamsByGame.map((group) => [toGameSlug(group.game), group._count])) },
      attention: { reportsOpen, feedbackPending: feedbackCount("PENDING"), feedbackReviewing: feedbackCount("REVIEWING") },
    };
  }

  /** One row per Vietnam day, oldest first, zero-filled. */
  private async daily(since: Date, days: number) {
    const [rows, activeRows] = await Promise.all([
      this.prisma.$queryRaw<Row<{ series: Series; day: Date }>>`
        SELECT 'signups' AS series, date_trunc('day', "createdAt" + interval '7 hours') AS day, COUNT(*)::bigint AS n FROM "User" WHERE "createdAt" >= ${since} GROUP BY 2
        UNION ALL SELECT 'messages', date_trunc('day', "createdAt" + interval '7 hours'), COUNT(*)::bigint FROM "Message" WHERE "createdAt" >= ${since} GROUP BY 2
        UNION ALL SELECT 'connections', date_trunc('day', "updatedAt" + interval '7 hours'), COUNT(*)::bigint FROM "MatchRequest" WHERE status = 'ACCEPTED' AND "updatedAt" >= ${since} GROUP BY 2
        UNION ALL SELECT 'teams', date_trunc('day', "createdAt" + interval '7 hours'), COUNT(*)::bigint FROM "Team" WHERE "createdAt" >= ${since} GROUP BY 2`,
      this.prisma.$queryRaw<Row<{ day: Date }>>`
        SELECT day, COUNT(DISTINCT uid)::bigint AS n FROM (
          SELECT date_trunc('day', "createdAt" + interval '7 hours') AS day, "userId" AS uid FROM "CreditTransaction" WHERE kind = 'REWARD' AND ref LIKE 'checkin:%' AND "createdAt" >= ${since}
          UNION ALL SELECT date_trunc('day', "createdAt" + interval '7 hours'), "senderId" FROM "Message" WHERE "createdAt" >= ${since}
          UNION ALL SELECT date_trunc('day', "createdAt" + interval '7 hours'), "senderId" FROM "MatchRequest" WHERE "createdAt" >= ${since}
        ) active GROUP BY day`,
    ]);
    const byKey = new Map(rows.map((row) => [`${row.series}:${sqlDayKey(row.day)}`, Number(row.n)]));
    const activeByDay = new Map(activeRows.map((row) => [sqlDayKey(row.day), Number(row.n)]));
    return vnDays(since, days).map((day) => ({
      day,
      active: activeByDay.get(day) ?? 0,
      ...(Object.fromEntries(SERIES.map((series) => [series, byKey.get(`${series}:${day}`) ?? 0])) as Record<Series, number>),
    }));
  }

  /** Who chatted and connected most, and the newest teams. */
  private async leaders(since: Date) {
    const [chatters, connectors, newTeams] = await Promise.all([
      this.prisma.message.groupBy({ by: ["senderId"], where: { createdAt: { gte: since } }, _count: true, orderBy: { _count: { senderId: "desc" } }, take: TOP }),
      this.prisma.$queryRaw<Row<{ userId: string }>>`
        SELECT uid AS "userId", COUNT(*)::bigint AS n FROM (
          SELECT "senderId" AS uid FROM "MatchRequest" WHERE status = 'ACCEPTED' AND "updatedAt" >= ${since}
          UNION ALL SELECT "receiverId" FROM "MatchRequest" WHERE status = 'ACCEPTED' AND "updatedAt" >= ${since} AND "receiverId" IS NOT NULL
        ) people GROUP BY uid ORDER BY n DESC LIMIT ${TOP}`,
      this.prisma.team.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: TOP,
        select: { id: true, name: true, game: true, logoKey: true, createdAt: true, captain: { select: USER_PICK }, _count: { select: { members: true } } },
      }),
    ]);
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...chatters.map((row) => row.senderId), ...connectors.map((row) => row.userId)] } },
      select: USER_PICK,
    });
    const withUser = <T extends object>(id: string, rest: T) => {
      const user = users.find((candidate) => candidate.id === id);
      return user ? [{ user, ...rest }] : [];
    };
    return {
      topChatters: chatters.flatMap((row) => withUser(row.senderId, { messages: row._count })),
      topConnectors: connectors.flatMap((row) => withUser(row.userId, { connections: Number(row.n) })),
      newTeams: newTeams.map(({ game, _count, ...team }) => ({ ...team, game: toGameSlug(game), members: _count.members })),
    };
  }
}

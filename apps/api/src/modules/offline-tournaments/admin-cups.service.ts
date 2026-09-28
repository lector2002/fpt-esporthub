import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, TournamentStatus } from "@fpt-esporthub/database";
import { PAGE_SIZE } from "../admin/dto/admin-query.dto";
import { PrismaService } from "../prisma/prisma.service";
import { ENTRY_INCLUDE, MATCH_ORDER, TOURNAMENT_SUMMARY_INCLUDE, toEntryView, toMatchView, toTournamentSummary } from "./tournament-view";

const PERSON = { id: true, displayName: true, avatarKey: true } as const;

/** Venue cups for the admin console: every status and venue, payments and captain reports included. */
@Injectable()
export class AdminCupsService {
  constructor(private prisma: PrismaService) {}

  async list(q: string | undefined, status: TournamentStatus | undefined, page: number) {
    const search = q?.trim();
    const where: Prisma.TournamentWhereInput = {
      ...(status ? { status } : {}),
      ...(search ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { venue: { name: { contains: search, mode: "insensitive" } } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.tournament.findMany({ where, include: TOURNAMENT_SUMMARY_INCLUDE, orderBy: { startsAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      this.prisma.tournament.count({ where }),
    ]);
    return { items: rows.map(toTournamentSummary), total, page, pageSize: PAGE_SIZE };
  }

  async get(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        ...TOURNAMENT_SUMMARY_INCLUDE,
        venue: { select: { id: true, name: true, address: true, city: true, status: true, owner: { select: PERSON } } },
        entries: { include: { ...ENTRY_INCLUDE, captain: { select: PERSON } }, orderBy: [{ seed: "asc" }, { createdAt: "asc" }] },
        matches: { orderBy: MATCH_ORDER },
      },
    });
    if (!tournament) throw new NotFoundException("Tournament not found");
    const { venue, entries, matches, ...rest } = tournament;
    return {
      tournament: toTournamentSummary({ ...rest, venue: { id: venue.id, name: venue.name, address: venue.address, city: venue.city } }),
      venue: { id: venue.id, name: venue.name, status: venue.status, owner: venue.owner },
      entries: entries.map((entry) => ({ ...toEntryView(entry, true), captain: entry.captain, createdAt: entry.createdAt })),
      matches: matches.map((match) => toMatchView(match, "all")),
    };
  }
}

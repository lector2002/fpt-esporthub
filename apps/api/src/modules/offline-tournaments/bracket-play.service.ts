import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, TournamentMatch } from "@fpt-esporthub/database";
import { PrismaService } from "../prisma/prisma.service";
import { getRankSort } from "../matching/matching.scoring";
import { OfflineTournamentsService } from "./offline-tournaments.service";
import { planBracket, type Slot } from "./bracket";
import { MATCH_ORDER, toMatchView, type MatchReports, type ReportAccess } from "./tournament-view";
import type { MatchResultDto } from "./dto/offline-tournament.dto";

const PLAYABLE = ["READY", "DISPUTED"] as const;

type Tx = Prisma.TransactionClient;

@Injectable()
export class BracketPlayService {
  constructor(
    private prisma: PrismaService,
    private tournaments: OfflineTournamentsService,
  ) {}

  /** Seeds checked-in teams by average player rank and stores the planned bracket. Teams that did not check in are left out. */
  async start(id: string, userId: string) {
    const tournament = await this.tournaments.requireHosted(id, userId);
    if (tournament.status !== "CHECK_IN") throw new ConflictException("Open check-in before starting the bracket");
    const entries = await this.prisma.tournamentEntry.findMany({
      where: { tournamentId: id, checkedInAt: { not: null } },
      include: { players: { select: { userId: true } } },
      orderBy: { createdAt: "asc" },
    });
    const minimum = tournament.format === "DOUBLE_ELIMINATION" ? 3 : 2;
    if (entries.length < minimum) throw new BadRequestException(`At least ${minimum} checked-in teams are needed`);

    const profiles = await this.prisma.playerProfile.findMany({
      where: { game: tournament.game, userId: { in: entries.flatMap((e) => e.players.map((p) => p.userId)) } },
      select: { userId: true, rankTier: true, rankLevel: true },
    });
    const rankOf = new Map(profiles.map((p) => [p.userId, getRankSort(tournament.game, p.rankTier, p.rankLevel)]));
    const averageRank = (players: { userId: string }[]) =>
      players.reduce((sum, p) => sum + (rankOf.get(p.userId) ?? 0), 0) / Math.max(players.length, 1);
    // Stable sort keeps registration order for equal ranks.
    const seeded = entries
      .map((entry) => ({ entry, rank: averageRank(entry.players) }))
      .sort((a, b) => b.rank - a.rank)
      .map(({ entry }) => entry);

    const planned = planBracket(seeded.length, tournament.format);
    const entryAt = (index: number | null) => (index === null ? null : seeded[index].id);

    await this.prisma.$transaction(async (tx) => {
      const moved = await tx.tournament.updateMany({ where: { id, status: "CHECK_IN" }, data: { status: "LIVE" } });
      if (moved.count === 0) throw new ConflictException("The bracket has already started");
      for (const [index, entry] of seeded.entries()) {
        await tx.tournamentEntry.update({ where: { id: entry.id }, data: { seed: index + 1 } });
      }
      await tx.tournamentMatch.createMany({
        data: planned.map((m) => {
          const entryAId = entryAt(m.entryA);
          const entryBId = entryAt(m.entryB);
          return {
            tournamentId: id,
            key: m.key,
            bracket: m.bracket,
            round: m.round,
            position: m.position,
            bestOf: m.winnerTo === null ? tournament.finalBestOf : tournament.bestOf,
            entryAId,
            entryBId,
            status: entryAId && entryBId ? "READY" : "PENDING",
            nextMatchKey: m.winnerTo?.match ?? null,
            nextSlot: m.winnerTo?.slot ?? null,
            loserMatchKey: m.loserTo?.match ?? null,
            loserSlot: m.loserTo?.slot ?? null,
          };
        }),
      });
    });
    return this.listMatches(id);
  }

  /** A captain reports the score. Matching reports from both captains settle the match; a mismatch flags it for the host. */
  async report(matchId: string, userId: string, dto: MatchResultDto) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const match = await this.requirePlayable(matchId);
      assertValidScore(match.bestOf, dto);
      const side = await this.captainSide(match, userId);
      const reports: MatchReports = { ...((match.reports as MatchReports | null) ?? {}), [side]: { scoreA: dto.scoreA, scoreB: dto.scoreB } };
      const other = reports[side === "A" ? "B" : "A"];
      if (other && other.scoreA === dto.scoreA && other.scoreB === dto.scoreB) {
        await this.applyResult(match, dto, reports);
        return this.getMatch(matchId, side);
      }
      // Optimistic write: if the other captain reported in between, re-read and compare again.
      const saved = await this.prisma.tournamentMatch.updateMany({
        where: { id: matchId, updatedAt: match.updatedAt },
        data: { reports, status: other ? "DISPUTED" : match.status },
      });
      if (saved.count === 1) return this.getMatch(matchId, side);
    }
    throw new ConflictException("The match changed while saving, try again");
  }

  /** Host decides the result, used for disputes and captains without the app. */
  async setResult(matchId: string, userId: string, dto: MatchResultDto) {
    const match = await this.requirePlayable(matchId);
    await this.tournaments.requireHosted(match.tournamentId, userId);
    assertValidScore(match.bestOf, dto);
    await this.applyResult(match, dto, (match.reports as MatchReports | null) ?? {});
    return this.getMatch(matchId, "all");
  }

  private async listMatches(tournamentId: string) {
    const matches = await this.prisma.tournamentMatch.findMany({ where: { tournamentId }, orderBy: MATCH_ORDER });
    return matches.map((m) => toMatchView(m, "all"));
  }

  private async getMatch(id: string, access: ReportAccess) {
    const match = await this.prisma.tournamentMatch.findUniqueOrThrow({ where: { id } });
    return toMatchView(match, access);
  }

  private async requirePlayable(matchId: string) {
    const match = await this.prisma.tournamentMatch.findUnique({ where: { id: matchId }, include: { tournament: { select: { status: true } } } });
    if (!match) throw new NotFoundException("Match not found");
    if (match.tournament.status !== "LIVE") throw new ConflictException("The tournament is not live");
    if (!(PLAYABLE as readonly string[]).includes(match.status)) {
      throw new ConflictException(match.status === "DONE" ? "This match already has a result" : "Both teams are not known yet");
    }
    return match;
  }

  private async captainSide(match: TournamentMatch, userId: string): Promise<Slot> {
    const entries = await this.prisma.tournamentEntry.findMany({
      where: { id: { in: [match.entryAId, match.entryBId].filter((id): id is string => id !== null) } },
      select: { id: true, captainId: true },
    });
    const mine = entries.find((e) => e.captainId === userId);
    if (!mine) throw new ForbiddenException("Only the captains of this match can report");
    return mine.id === match.entryAId ? "A" : "B";
  }

  /** Settles the match and moves the winner (and in double elimination the loser) along the stored links. */
  private async applyResult(match: TournamentMatch, dto: MatchResultDto, reports: MatchReports) {
    const winner = dto.scoreA > dto.scoreB ? match.entryAId! : match.entryBId!;
    const loser = winner === match.entryAId ? match.entryBId! : match.entryAId!;
    await this.prisma.$transaction(async (tx) => {
      const settled = await tx.tournamentMatch.updateMany({
        where: { id: match.id, status: { in: [...PLAYABLE] } },
        data: { scoreA: dto.scoreA, scoreB: dto.scoreB, winnerEntryId: winner, status: "DONE", reports },
      });
      if (settled.count === 0) throw new ConflictException("This match already has a result");
      if (match.nextMatchKey) {
        await placeEntry(tx, match.tournamentId, match.nextMatchKey, match.nextSlot as Slot, winner);
      } else {
        await tx.tournament.update({ where: { id: match.tournamentId }, data: { status: "COMPLETED", championEntryId: winner } });
      }
      if (match.loserMatchKey) {
        await placeEntry(tx, match.tournamentId, match.loserMatchKey, match.loserSlot as Slot, loser);
      }
    });
  }
}

async function placeEntry(tx: Tx, tournamentId: string, key: string, slot: Slot, entryId: string) {
  const target = await tx.tournamentMatch.update({
    where: { tournamentId_key: { tournamentId, key } },
    data: slot === "A" ? { entryAId: entryId } : { entryBId: entryId },
  });
  if (target.entryAId && target.entryBId && target.status === "PENDING") {
    await tx.tournamentMatch.update({ where: { id: target.id }, data: { status: "READY" } });
  }
}

/** The winner takes the majority of games; ties are not possible in elimination. */
function assertValidScore(bestOf: number, { scoreA, scoreB }: MatchResultDto) {
  const needed = Math.ceil(bestOf / 2);
  const high = Math.max(scoreA, scoreB);
  const low = Math.min(scoreA, scoreB);
  if (high !== needed || low >= needed) throw new BadRequestException(`Best of ${bestOf}: the winner needs exactly ${needed} wins`);
}

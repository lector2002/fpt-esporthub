import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { TournamentStatus } from "@fpt-esporthub/database";
import { PrismaService } from "../prisma/prisma.service";
import { GAME_MAP, parseGame, toGameSlug } from "../../common/game";
import { assertCanInteract } from "../../common/account";
import { VenuesService } from "./venues.service";
import type {
  CreateOfflineTournamentDto,
  RegisterEntryDto,
  TournamentStatusDto,
  UpdateEntryDto,
  UpdateOfflineTournamentDto,
} from "./dto/offline-tournament.dto";
import {
  ENTRY_INCLUDE,
  MATCH_ORDER,
  TOURNAMENT_SUMMARY_INCLUDE,
  toEntryView,
  reportAccess,
  toMatchView,
  toTournamentSummary,
} from "./tournament-view";

/** Players can join or leave until the bracket is generated. */
const OPEN_STATUSES: TournamentStatus[] = ["REGISTRATION", "CHECK_IN"];

/** Allowed host status changes; LIVE and COMPLETED are only reached through start and results. */
const STATUS_FLOW: Record<TournamentStatusDto["status"], TournamentStatus[]> = {
  REGISTRATION: ["CHECK_IN"],
  CHECK_IN: ["REGISTRATION"],
  CANCELLED: ["REGISTRATION", "CHECK_IN", "LIVE"],
};

@Injectable()
export class OfflineTournamentsService {
  constructor(
    private prisma: PrismaService,
    private venues: VenuesService,
  ) {}

  async list(game: string | undefined) {
    const tournaments = await this.prisma.tournament.findMany({
      where: { game: parseGame(game), status: { not: "CANCELLED" }, venue: { status: "APPROVED" } },
      include: TOURNAMENT_SUMMARY_INCLUDE,
      orderBy: [{ startsAt: "asc" }],
      take: 100,
    });
    // Finished tournaments go after the upcoming ones.
    const summaries = tournaments.map(toTournamentSummary);
    return [...summaries.filter((t) => t.status !== "COMPLETED"), ...summaries.filter((t) => t.status === "COMPLETED")];
  }

  async listHosted(userId: string) {
    const venue = await this.venues.getMine(userId);
    if (!venue) return [];
    const tournaments = await this.prisma.tournament.findMany({
      where: { venueId: venue.id },
      include: TOURNAMENT_SUMMARY_INCLUDE,
      orderBy: { startsAt: "desc" },
    });
    return tournaments.map(toTournamentSummary);
  }

  async findOne(id: string, viewerId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        ...TOURNAMENT_SUMMARY_INCLUDE,
        venue: { select: { id: true, name: true, address: true, city: true, ownerId: true } },
        entries: { include: ENTRY_INCLUDE, orderBy: [{ seed: "asc" }, { createdAt: "asc" }] },
        matches: { orderBy: MATCH_ORDER },
      },
    });
    if (!tournament) throw new NotFoundException("Tournament not found");
    const isHost = tournament.venue.ownerId === viewerId;
    const myEntry = tournament.entries.find((e) => e.captainId === viewerId || e.players.some((p) => p.userId === viewerId));
    const mySlot = myEntry
      ? await this.prisma.tournamentEntryPlayer.findUnique({
          where: { entryId_userId: { entryId: myEntry.id, userId: viewerId } },
          select: { checkInCode: true, checkedInAt: true },
        })
      : null;
    const { venue, entries, matches, ...rest } = tournament;
    const captainOf = new Map(entries.map((e) => [e.id, e.captainId]));
    return {
      tournament: toTournamentSummary({ ...rest, venue: { id: venue.id, name: venue.name, address: venue.address, city: venue.city } }),
      isHost,
      myEntryId: myEntry?.id ?? null,
      myCheckIn: mySlot && OPEN_STATUSES.includes(tournament.status) ? { code: mySlot.checkInCode, checkedIn: mySlot.checkedInAt !== null } : null,
      entries: entries.map((e) => toEntryView(e, isHost || e.captainId === viewerId)),
      matches: matches.map((m) => toMatchView(m, reportAccess(m, viewerId, isHost, captainOf))),
    };
  }

  /** No sign-in: the venue TV shows team names and results only. */
  async getPublicBracket(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        venue: { select: { name: true, city: true } },
        entries: { select: { id: true, teamName: true, seed: true }, orderBy: [{ seed: "asc" }, { createdAt: "asc" }] },
        matches: { orderBy: MATCH_ORDER },
      },
    });
    if (!tournament || tournament.status === "CANCELLED") throw new NotFoundException("Tournament not found");
    return {
      id: tournament.id,
      title: tournament.title,
      game: toGameSlug(tournament.game),
      format: tournament.format,
      status: tournament.status,
      startsAt: tournament.startsAt,
      championEntryId: tournament.championEntryId,
      venue: tournament.venue,
      entries: tournament.entries,
      matches: tournament.matches.map((m) => toMatchView(m, "none")),
    };
  }

  async create(userId: string, dto: CreateOfflineTournamentDto) {
    const venue = await this.venues.requireApproved(userId);
    const startsAt = new Date(dto.startsAt);
    if (startsAt.getTime() <= Date.now()) throw new BadRequestException("Start time must be in the future");
    const created = await this.prisma.tournament.create({
      data: {
        venueId: venue.id,
        title: dto.title,
        game: GAME_MAP[dto.game],
        format: dto.format,
        teamSize: dto.teamSize,
        maxTeams: dto.maxTeams,
        bestOf: dto.bestOf,
        finalBestOf: dto.finalBestOf,
        entryFee: dto.entryFee,
        prize: dto.prize || null,
        rules: dto.rules || null,
        startsAt,
      },
      include: TOURNAMENT_SUMMARY_INCLUDE,
    });
    return toTournamentSummary(created);
  }

  async update(id: string, userId: string, dto: UpdateOfflineTournamentDto) {
    const tournament = await this.requireHosted(id, userId);
    if (tournament.status !== "REGISTRATION") throw new ConflictException("Settings are locked once check-in opens");
    if (dto.maxTeams !== undefined) {
      const entries = await this.prisma.tournamentEntry.count({ where: { tournamentId: id } });
      if (dto.maxTeams < entries) throw new BadRequestException(`${entries} teams are already registered`);
    }
    if (dto.startsAt && new Date(dto.startsAt).getTime() <= Date.now()) {
      throw new BadRequestException("Start time must be in the future");
    }
    const updated = await this.prisma.tournament.update({
      where: { id },
      data: {
        ...dto,
        prize: dto.prize === undefined ? undefined : dto.prize || null,
        rules: dto.rules === undefined ? undefined : dto.rules || null,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      },
      include: TOURNAMENT_SUMMARY_INCLUDE,
    });
    return toTournamentSummary(updated);
  }

  async setStatus(id: string, userId: string, status: TournamentStatusDto["status"]) {
    const tournament = await this.requireHosted(id, userId);
    if (!STATUS_FLOW[status].includes(tournament.status)) {
      throw new ConflictException(`Cannot move from ${tournament.status} to ${status}`);
    }
    const updated = await this.prisma.tournament.update({ where: { id }, data: { status }, include: TOURNAMENT_SUMMARY_INCLUDE });
    return toTournamentSummary(updated);
  }

  async register(tournamentId: string, userId: string, dto: RegisterEntryDto) {
    await assertCanInteract(this.prisma, userId);
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException("Tournament not found");
    if (tournament.status !== "REGISTRATION") throw new ConflictException("Registration is closed");
    const team = await this.prisma.team.findUnique({ where: { id: dto.teamId }, include: { members: { select: { userId: true } } } });
    if (!team || team.captainId !== userId) throw new ForbiddenException("Only the team captain can register the team");
    if (team.game !== tournament.game) throw new BadRequestException("This team plays a different game");
    if (dto.playerIds.length !== tournament.teamSize) {
      throw new BadRequestException(`Pick exactly ${tournament.teamSize} players`);
    }
    const memberIds = new Set(team.members.map((m) => m.userId));
    if (!dto.playerIds.every((id) => memberIds.has(id))) throw new BadRequestException("Every player must be on the team");

    const taken = await this.prisma.tournamentEntryPlayer.findFirst({
      where: { userId: { in: dto.playerIds }, entry: { tournamentId } },
      select: { user: { select: { displayName: true } } },
    });
    if (taken) throw new ConflictException(`${taken.user.displayName} is already registered with another team`);

    return this.prisma.$transaction(async (tx) => {
      const count = await tx.tournamentEntry.count({ where: { tournamentId } });
      if (count >= tournament.maxTeams) throw new ConflictException("The tournament is full");
      const existing = await tx.tournamentEntry.findUnique({ where: { tournamentId_teamId: { tournamentId, teamId: team.id } } });
      if (existing) throw new ConflictException("This team is already registered");
      const entry = await tx.tournamentEntry.create({
        data: {
          tournamentId,
          teamId: team.id,
          teamName: team.name,
          captainId: userId,
          players: { create: dto.playerIds.map((playerId) => ({ userId: playerId, checkInCode: newCheckInCode() })) },
        },
        include: ENTRY_INCLUDE,
      });
      return toEntryView(entry, true);
    });
  }

  async withdraw(tournamentId: string, userId: string) {
    const entry = await this.prisma.tournamentEntry.findFirst({ where: { tournamentId, captainId: userId }, include: { tournament: true } });
    if (!entry) throw new NotFoundException("Your team is not registered");
    if (!OPEN_STATUSES.includes(entry.tournament.status)) throw new ConflictException("The bracket has already started");
    await this.prisma.tournamentEntry.delete({ where: { id: entry.id } });
    return { success: true };
  }

  /** Host desk: payment is tracked by hand; check-in can be forced for a player without a phone. */
  async updateEntry(tournamentId: string, entryId: string, userId: string, dto: UpdateEntryDto) {
    const tournament = await this.requireHosted(tournamentId, userId);
    const entry = await this.prisma.tournamentEntry.findFirst({ where: { id: entryId, tournamentId } });
    if (!entry) throw new NotFoundException("Entry not found");
    if (dto.checkedIn !== undefined && tournament.status !== "CHECK_IN") {
      throw new ConflictException("Check-in is not open for this tournament");
    }
    const now = new Date();
    const updated = await this.prisma.tournamentEntry.update({
      where: { id: entryId },
      data: {
        paidAt: dto.paid === undefined ? undefined : dto.paid ? (entry.paidAt ?? now) : null,
        checkedInAt: dto.checkedIn === undefined ? undefined : dto.checkedIn ? (entry.checkedInAt ?? now) : null,
      },
      include: ENTRY_INCLUDE,
    });
    return toEntryView(updated, true);
  }

  /** Host scans a player's QR. The team counts as checked in once all its players are. */
  async checkIn(userId: string, code: string) {
    const slot = await this.prisma.tournamentEntryPlayer.findUnique({
      where: { checkInCode: code },
      include: { user: { select: { displayName: true } }, entry: { include: { tournament: { include: { venue: true } } } } },
    });
    if (!slot || slot.entry.tournament.venue.ownerId !== userId) throw new NotFoundException("Unknown check-in code");
    const { entry } = slot;
    if (entry.tournament.status !== "CHECK_IN") throw new ConflictException("Check-in is not open for this tournament");

    const alreadyCheckedIn = slot.checkedInAt !== null;
    const now = new Date();
    const players = await this.prisma.$transaction(async (tx) => {
      if (!alreadyCheckedIn) await tx.tournamentEntryPlayer.update({ where: { id: slot.id }, data: { checkedInAt: now } });
      const all = await tx.tournamentEntryPlayer.findMany({ where: { entryId: entry.id }, select: { checkedInAt: true } });
      if (!entry.checkedInAt && all.every((p) => p.checkedInAt !== null)) {
        await tx.tournamentEntry.update({ where: { id: entry.id }, data: { checkedInAt: now } });
      }
      return all;
    });
    const checkedIn = players.filter((p) => p.checkedInAt !== null).length;
    return {
      tournamentId: entry.tournamentId,
      tournamentTitle: entry.tournament.title,
      entryId: entry.id,
      teamName: entry.teamName,
      playerName: slot.user.displayName,
      alreadyCheckedIn,
      playersCheckedIn: checkedIn,
      playersTotal: players.length,
      teamCheckedIn: entry.checkedInAt !== null || checkedIn === players.length,
      paid: entry.paidAt !== null,
    };
  }

  async requireHosted(id: string, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id }, include: { venue: { select: { ownerId: true } } } });
    if (!tournament) throw new NotFoundException("Tournament not found");
    if (tournament.venue.ownerId !== userId) throw new ForbiddenException("Only the host venue can manage this tournament");
    return tournament;
  }
}

function newCheckInCode() {
  return randomBytes(12).toString("base64url");
}

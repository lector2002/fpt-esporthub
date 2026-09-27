import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { parseGame, toGameSlug } from "../../common/game";
import { PrismaService } from "../prisma/prisma.service";
import { TeamsService } from "../teams/teams.service";
import { blockedUserIds } from "../teams/team-view";
import { CreateTournamentDto, UpdateTournamentDto } from "./dto/tournament.dto";

const RECRUITING_TEAMS_LIMIT = 10;
const INTERESTED_PLAYERS_LIMIT = 50;

type EventRow = {
  id: string;
  title: string;
  game: "VALORANT" | "LEAGUE_OF_LEGENDS";
  organizer: string;
  startsAt: Date;
  deadlineAt: Date;
  rules: string | null;
  registrationUrl: string | null;
  format: string | null;
  prize: string | null;
  teamSize: number | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { interests: number };
  interests: { userId: string }[];
};

function toEventSummary(event: EventRow) {
  const { _count, interests, game, ...rest } = event;
  return {
    ...rest,
    game: toGameSlug(game),
    interestedCount: _count.interests,
    viewerInterested: interests.length > 0,
    registrationOpen: event.deadlineAt.getTime() > Date.now(),
  };
}

@Injectable()
export class TournamentsService {
  constructor(
    private prisma: PrismaService,
    private teamsService: TeamsService,
  ) {}

  private eventInclude(viewerId?: string) {
    return {
      _count: { select: { interests: true } },
      // A viewer-less query must match nothing; an empty id never exists.
      interests: { where: { userId: viewerId ?? "" }, select: { userId: true } },
    };
  }

  async findAll(viewerId: string | undefined, gameSlug?: string, when?: string) {
    const game = parseGame(gameSlug);
    const past = when === "past";
    const now = new Date();
    const events = await this.prisma.tournamentEvent.findMany({
      where: { ...(game ? { game } : {}), startsAt: past ? { lt: now } : { gte: now } },
      include: this.eventInclude(viewerId),
      orderBy: { startsAt: past ? "desc" : "asc" },
    });
    return { events: events.map(toEventSummary) };
  }

  async findOne(eventId: string, viewerId?: string) {
    const event = await this.prisma.tournamentEvent.findUnique({
      where: { id: eventId },
      include: this.eventInclude(viewerId),
    });
    if (!event) throw new NotFoundException("Event not found");

    const [interestedPlayers, recruitingTeams] = await Promise.all([
      viewerId ? this.interestedPlayers(event.id, event.game, viewerId) : [],
      this.teamsService.findRecruiting(event.game, viewerId, RECRUITING_TEAMS_LIMIT),
    ]);
    return { event: { ...toEventSummary(event), interestedPlayers, recruitingTeams } };
  }

  private async interestedPlayers(eventId: string, game: EventRow["game"], viewerId: string) {
    const excluded = [viewerId, ...(await blockedUserIds(this.prisma, viewerId))];
    const interests = await this.prisma.tournamentEventInterest.findMany({
      where: { eventId, userId: { notIn: excluded }, user: { profiles: { some: { game } } } },
      orderBy: { createdAt: "desc" },
      take: INTERESTED_PLAYERS_LIMIT,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            reputationBadge: true,
            avatarKey: true,
            profiles: { where: { game }, select: { rankTier: true, rankLevel: true, role: true, playModes: true } },
          },
        },
      },
    });
    return interests.map(({ user }) => ({
      id: user.id,
      displayName: user.displayName,
      avatarKey: user.avatarKey,
      reputationBadge: user.reputationBadge,
      rankTier: user.profiles[0]?.rankTier ?? "",
      rankLevel: user.profiles[0]?.rankLevel ?? null,
      role: user.profiles[0]?.role ?? "",
      playModes: user.profiles[0]?.playModes ?? ["ranked"],
    }));
  }

  async addInterest(eventId: string, userId: string) {
    await this.requireOpenRegistration(eventId);
    await this.prisma.tournamentEventInterest.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: {},
      create: { eventId, userId },
    });
    return this.interestState(eventId, true);
  }

  async removeInterest(eventId: string, userId: string) {
    await this.requireOpenRegistration(eventId);
    await this.prisma.tournamentEventInterest.deleteMany({ where: { eventId, userId } });
    return this.interestState(eventId, false);
  }

  async create(dto: CreateTournamentDto) {
    const dates = validateDates(dto.startsAt, dto.deadlineAt);
    const event = await this.prisma.tournamentEvent.create({
      data: {
        title: dto.title.trim(),
        game: parseGame(dto.game)!,
        organizer: dto.organizer.trim(),
        rules: dto.rules?.trim() || null,
        registrationUrl: dto.registrationUrl?.trim() || null,
        format: dto.format?.trim() || null,
        prize: dto.prize?.trim() || null,
        teamSize: dto.teamSize ?? null,
        ...dates,
      },
      include: this.eventInclude(),
    });
    return { event: toEventSummary(event) };
  }

  async update(eventId: string, dto: UpdateTournamentDto) {
    const existing = await this.prisma.tournamentEvent.findUnique({ where: { id: eventId } });
    if (!existing) throw new NotFoundException("Event not found");
    const dates = validateDates(dto.startsAt ?? existing.startsAt, dto.deadlineAt ?? existing.deadlineAt);
    const event = await this.prisma.tournamentEvent.update({
      where: { id: eventId },
      data: {
        ...dates,
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.game !== undefined ? { game: parseGame(dto.game) } : {}),
        ...(dto.organizer !== undefined ? { organizer: dto.organizer.trim() } : {}),
        ...(dto.rules !== undefined ? { rules: dto.rules.trim() || null } : {}),
        ...(dto.registrationUrl !== undefined ? { registrationUrl: dto.registrationUrl.trim() || null } : {}),
        ...(dto.format !== undefined ? { format: dto.format.trim() || null } : {}),
        ...(dto.prize !== undefined ? { prize: dto.prize.trim() || null } : {}),
        ...(dto.teamSize !== undefined ? { teamSize: dto.teamSize } : {}),
      },
      include: this.eventInclude(),
    });
    return { event: toEventSummary(event) };
  }

  async remove(eventId: string) {
    const existing = await this.prisma.tournamentEvent.findUnique({ where: { id: eventId } });
    if (!existing) throw new NotFoundException("Event not found");
    await this.prisma.tournamentEvent.delete({ where: { id: eventId } });
    return { success: true };
  }

  private async requireOpenRegistration(eventId: string) {
    const event = await this.prisma.tournamentEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException("Event not found");
    if (event.deadlineAt.getTime() <= Date.now()) {
      throw new ConflictException("Registration for this event has closed");
    }
  }

  private async interestState(eventId: string, interested: boolean) {
    const interestedCount = await this.prisma.tournamentEventInterest.count({ where: { eventId } });
    return { interested, interestedCount };
  }
}

function validateDates(startsAt: string | Date, deadlineAt: string | Date) {
  const starts = new Date(startsAt);
  const deadline = new Date(deadlineAt);
  if (Number.isNaN(starts.getTime()) || Number.isNaN(deadline.getTime())) {
    throw new BadRequestException("Invalid date");
  }
  if (deadline.getTime() > starts.getTime()) {
    throw new BadRequestException("Registration deadline must be on or before the start time");
  }
  return { startsAt: starts, deadlineAt: deadline };
}

import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from "@nestjs/common";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import type { VenueStatus } from "@fpt-esporthub/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/guards/roles.decorator";
import { OfflineTournamentsService } from "./offline-tournaments.service";
import { BracketPlayService } from "./bracket-play.service";
import { VenuesService } from "./venues.service";
import { ApplyVenueDto, ReviewVenueDto } from "./dto/venue.dto";
import {
  CheckInDto,
  CreateOfflineTournamentDto,
  MatchResultDto,
  RegisterEntryDto,
  TournamentStatusDto,
  UpdateEntryDto,
  UpdateOfflineTournamentDto,
} from "./dto/offline-tournament.dto";

type AuthedRequest = { user: { id: string } };

// Rate limits count per route and per IP, and a whole cafe shares one IP: the bracket reads everyone polls are not limited.

const VENUE_STATUSES: VenueStatus[] = ["PENDING", "APPROVED", "REJECTED"];

@Controller("venues")
@UseGuards(JwtAuthGuard)
export class VenuesController {
  constructor(private venues: VenuesService) {}

  @Get("mine")
  async getMine(@Request() req: AuthedRequest) {
    return { venue: await this.venues.getMine(req.user.id) };
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  apply(@Request() req: AuthedRequest, @Body() dto: ApplyVenueDto) {
    return this.venues.apply(req.user.id, dto);
  }
}

@Controller("admin/venues")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminVenuesController {
  constructor(private venues: VenuesService) {}

  @Get()
  list(@Query("status") status?: string) {
    const filter = VENUE_STATUSES.find((s) => s === status);
    return this.venues.listForAdmin(filter);
  }

  @Put(":id/review")
  review(@Param("id") id: string, @Body() dto: ReviewVenueDto) {
    return this.venues.review(id, dto);
  }
}

@Controller("offline-tournaments")
@UseGuards(JwtAuthGuard)
export class OfflineTournamentsController {
  constructor(
    private tournaments: OfflineTournamentsService,
    private play: BracketPlayService,
  ) {}

  @Get()
  list(@Query("game") game?: string) {
    return this.tournaments.list(game);
  }

  @Get("hosted")
  listHosted(@Request() req: AuthedRequest) {
    return this.tournaments.listHosted(req.user.id);
  }

  @Post("check-in")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  checkIn(@Request() req: AuthedRequest, @Body() dto: CheckInDto) {
    return this.tournaments.checkIn(req.user.id, dto.code);
  }

  @Post("matches/:matchId/report")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  report(@Request() req: AuthedRequest, @Param("matchId") matchId: string, @Body() dto: MatchResultDto) {
    return this.play.report(matchId, req.user.id, dto);
  }

  @Post("matches/:matchId/result")
  setResult(@Request() req: AuthedRequest, @Param("matchId") matchId: string, @Body() dto: MatchResultDto) {
    return this.play.setResult(matchId, req.user.id, dto);
  }

  @Get(":id")
  @SkipThrottle()
  findOne(@Request() req: AuthedRequest, @Param("id") id: string) {
    return this.tournaments.findOne(id, req.user.id);
  }

  @Post()
  create(@Request() req: AuthedRequest, @Body() dto: CreateOfflineTournamentDto) {
    return this.tournaments.create(req.user.id, dto);
  }

  @Put(":id")
  update(@Request() req: AuthedRequest, @Param("id") id: string, @Body() dto: UpdateOfflineTournamentDto) {
    return this.tournaments.update(id, req.user.id, dto);
  }

  @Post(":id/status")
  setStatus(@Request() req: AuthedRequest, @Param("id") id: string, @Body() dto: TournamentStatusDto) {
    return this.tournaments.setStatus(id, req.user.id, dto.status);
  }

  @Post(":id/start")
  start(@Request() req: AuthedRequest, @Param("id") id: string) {
    return this.play.start(id, req.user.id);
  }

  @Post(":id/entries")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  register(@Request() req: AuthedRequest, @Param("id") id: string, @Body() dto: RegisterEntryDto) {
    return this.tournaments.register(id, req.user.id, dto);
  }

  @Delete(":id/entries/mine")
  withdraw(@Request() req: AuthedRequest, @Param("id") id: string) {
    return this.tournaments.withdraw(id, req.user.id);
  }

  @Put(":id/entries/:entryId")
  updateEntry(@Request() req: AuthedRequest, @Param("id") id: string, @Param("entryId") entryId: string, @Body() dto: UpdateEntryDto) {
    return this.tournaments.updateEntry(id, entryId, req.user.id, dto);
  }
}

/** Venue TV screen: no sign-in, team names and results only. */
@Controller("public/offline-tournaments")
export class PublicBracketController {
  constructor(private tournaments: OfflineTournamentsService) {}

  @Get(":id/bracket")
  @SkipThrottle()
  getBracket(@Param("id") id: string) {
    return this.tournaments.getPublicBracket(id);
  }
}

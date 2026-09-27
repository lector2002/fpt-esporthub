import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Request, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { LinkRiotDto } from "./dto/link-riot.dto";
import { requireGame } from "./riot-profile";
import { RiotStatsService } from "./riot-stats.service";
import { RiotService } from "./riot.service";

type AuthRequest = { user: { id: string } };

@Controller("riot")
@UseGuards(JwtAuthGuard)
export class RiotController {
  constructor(
    private riot: RiotService,
    private stats: RiotStatsService,
  ) {}

  /** Each lookup costs 3 Riot calls from the shared app key. */
  @Get("lookup")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  lookup(@Request() req: AuthRequest, @Query("game") game?: string, @Query("riotId") riotId?: string) {
    return this.riot.lookup(req.user.id, requireGame(game), riotId);
  }

  /** Accounts matching what the user is typing; each Riot candidate costs 3 calls, so the web app debounces it. */
  @Get("suggest")
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  suggest(@Request() req: AuthRequest, @Query("game") game?: string, @Query("q") q?: string) {
    return this.riot.suggest(req.user.id, requireGame(game), q);
  }

  @Post("link")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  link(@Request() req: AuthRequest, @Query("game") game: string | undefined, @Body() body: LinkRiotDto) {
    return this.riot.link(req.user.id, requireGame(game), body.riotId);
  }

  @Delete("link")
  unlink(@Request() req: AuthRequest, @Query("game") game?: string) {
    return this.riot.unlink(req.user.id, requireGame(game));
  }

  @Post("verify/start")
  @HttpCode(200)
  startVerification(@Request() req: AuthRequest, @Query("game") game?: string) {
    return this.riot.startVerification(req.user.id, requireGame(game));
  }

  @Post("verify/confirm")
  @HttpCode(200)
  confirmVerification(@Request() req: AuthRequest, @Query("game") game?: string) {
    return this.riot.confirmVerification(req.user.id, requireGame(game));
  }

  @Post("sync")
  @HttpCode(200)
  sync(@Request() req: AuthRequest, @Query("game") game?: string) {
    return this.stats.sync(req.user.id, requireGame(game));
  }

  @Get("stats")
  getOwnStats(@Request() req: AuthRequest, @Query("game") game?: string) {
    return this.stats.getOwn(req.user.id, requireGame(game));
  }

  @Get("stats/:userId")
  getPublicStats(@Request() req: AuthRequest, @Param("userId") userId: string, @Query("game") game?: string) {
    return this.stats.getPublic(req.user.id, userId, requireGame(game));
  }
}

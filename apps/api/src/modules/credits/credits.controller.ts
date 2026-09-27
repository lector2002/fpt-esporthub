import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, Request, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/guards/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreditsService } from "./credits.service";
import { AdjustCreditsDto, BoostProfileDto, CreateTopUpDto } from "./dto/credits.dto";
import { PromotionsService } from "./promotions.service";

type AuthedRequest = { user: { id: string } };

@Controller("credits")
@UseGuards(JwtAuthGuard)
export class CreditsController {
  constructor(
    private credits: CreditsService,
    private promotions: PromotionsService,
  ) {}

  @Get("me")
  mine(@Request() req: AuthedRequest) {
    return this.credits.getMine(req.user.id);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("topups")
  createTopUp(@Request() req: AuthedRequest, @Body() dto: CreateTopUpDto) {
    return this.credits.createTopUp(req.user.id, dto.credits);
  }

  @Get("topups/:orderCode")
  topUp(@Request() req: AuthedRequest, @Param("orderCode", ParseIntPipe) orderCode: number) {
    return this.credits.getTopUp(req.user.id, orderCode);
  }

  @Post("promotions/boost")
  boost(@Request() req: AuthedRequest, @Body() dto: BoostProfileDto) {
    return this.promotions.boostProfile(req.user.id, dto.game);
  }

  @Post("promotions/teams/:teamId/feature")
  feature(@Request() req: AuthedRequest, @Param("teamId") teamId: string) {
    return this.promotions.featureTeam(req.user.id, teamId);
  }

  @Post("topups/:orderCode/mock-pay")
  mockPay(@Request() req: AuthedRequest, @Param("orderCode", ParseIntPipe) orderCode: number) {
    return this.credits.mockPay(req.user.id, orderCode);
  }

  @Post("topups/:orderCode/mock-cancel")
  mockCancel(@Request() req: AuthedRequest, @Param("orderCode", ParseIntPipe) orderCode: number) {
    return this.credits.mockCancel(req.user.id, orderCode);
  }
}

/** payOS calls this; trust comes from the signature, not from a session. */
@Controller("payments")
export class PaymentsWebhookController {
  constructor(private credits: CreditsService) {}

  @Post("payos/webhook")
  @HttpCode(200)
  webhook(@Body() body: unknown) {
    return this.credits.handleWebhook(body);
  }
}

@Controller("admin/credits")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminCreditsController {
  constructor(private credits: CreditsService) {}

  @Get()
  list(@Query("userId") userId?: string) {
    return this.credits.adminList(userId || undefined).then((transactions) => ({ transactions }));
  }

  @Post("adjust")
  adjust(@Request() req: AuthedRequest, @Body() dto: AdjustCreditsDto) {
    return this.credits.adminAdjust(req.user.id, dto.userId, dto.amount, dto.note);
  }
}

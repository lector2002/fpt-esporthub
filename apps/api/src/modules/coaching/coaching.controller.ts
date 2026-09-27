import { Body, Controller, Get, Param, Post, Put, Query, Request, UseGuards } from "@nestjs/common";
import type { CoachReviewStatus } from "@fpt-esporthub/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/guards/roles.decorator";
import { CoachingService } from "./coaching.service";
import { CoachingRequestsService } from "./coaching-requests.service";
import { CreateCoachProfileDto } from "./dto/create-coach-profile.dto";
import { CreateCoachingRequestDto } from "./dto/create-coaching-request.dto";
import { CounterCoachingRequestDto } from "./dto/counter-coaching-request.dto";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";
import { SetCoachActiveDto } from "./dto/set-coach-active.dto";
import { ReviewCoachDto } from "./dto/review-coach.dto";
import { RecordPayoutDto, ResolveDisputeDto } from "./dto/coaching-payments.dto";
import { CoachingSettlementService } from "./coaching-settlement.service";

type AuthedRequest = { user: { id: string } };

@UseGuards(JwtAuthGuard)
@Controller("coaching")
export class CoachingController {
  constructor(
    private coachingService: CoachingService,
    private requestsService: CoachingRequestsService,
  ) {}

  @Get("coaches")
  findAll(@Query("game") game?: string) { return this.coachingService.findAll(game); }

  // "me" routes stay above "coaches/:id" so "me" is never read as an id.
  @Get("coaches/me")
  findMine(@Request() req: AuthedRequest) { return this.coachingService.findMine(req.user.id); }

  @Post("coaches/me")
  upsertMine(@Request() req: AuthedRequest, @Body() dto: CreateCoachProfileDto) { return this.coachingService.upsertMine(req.user.id, dto); }

  @Put("coaches/me/active")
  setActive(@Request() req: AuthedRequest, @Body() dto: SetCoachActiveDto) { return this.coachingService.setActive(req.user.id, dto.active); }

  @Get("coaches/:id")
  findOne(@Request() req: AuthedRequest, @Param("id") id: string) { return this.coachingService.findOne(req.user.id, id); }

  @Post("coaches/:id/feedback")
  createFeedback(@Request() req: AuthedRequest, @Param("id") id: string, @Body() dto: CreateFeedbackDto) { return this.coachingService.createFeedback(req.user.id, id, dto); }

  @Get("requests")
  findRequests(@Request() req: AuthedRequest) { return this.requestsService.findAll(req.user.id); }

  @Post("requests")
  createRequest(@Request() req: AuthedRequest, @Body() dto: CreateCoachingRequestDto) { return this.requestsService.create(req.user.id, dto); }

  @Put("requests/:id/counter")
  counter(@Request() req: AuthedRequest, @Param("id") id: string, @Body() dto: CounterCoachingRequestDto) { return this.requestsService.counter(id, req.user.id, dto); }

  @Put("requests/:id/agree")
  agree(@Request() req: AuthedRequest, @Param("id") id: string) { return this.requestsService.agree(id, req.user.id); }

  @Put("requests/:id/decline")
  decline(@Request() req: AuthedRequest, @Param("id") id: string) { return this.requestsService.decline(id, req.user.id); }

  @Put("requests/:id/cancel")
  cancel(@Request() req: AuthedRequest, @Param("id") id: string) { return this.requestsService.cancel(id, req.user.id); }

  @Put("requests/:id/confirm")
  confirm(@Request() req: AuthedRequest, @Param("id") id: string) { return this.requestsService.confirmSession(id, req.user.id); }

  @Put("requests/:id/dispute")
  dispute(@Request() req: AuthedRequest, @Param("id") id: string) { return this.requestsService.disputeSession(id, req.user.id); }
}

const REVIEW_STATUSES: CoachReviewStatus[] = ["PENDING", "APPROVED", "REJECTED"];

@Controller("admin/coaches")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminCoachesController {
  constructor(private coachingService: CoachingService) {}

  @Get()
  list(@Query("status") status?: string) {
    return this.coachingService.listForAdmin(REVIEW_STATUSES.find((s) => s === status));
  }

  @Put(":id/review")
  review(@Param("id") id: string, @Body() dto: ReviewCoachDto) {
    return this.coachingService.review(id, dto);
  }
}

/** Credit-paid coaching: disputes to settle and coach payouts to record. */
@Controller("admin/coaching")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminCoachingPaymentsController {
  constructor(private settlement: CoachingSettlementService) {}

  @Get("payments")
  overview() {
    return this.settlement.adminOverview();
  }

  @Post("requests/:id/resolve")
  resolve(@Param("id") id: string, @Body() dto: ResolveDisputeDto) {
    return this.settlement.resolveDispute(id, dto.outcome);
  }

  @Post("coaches/:id/payouts")
  payout(@Request() req: AuthedRequest, @Param("id") id: string, @Body() dto: RecordPayoutDto) {
    return this.settlement.recordPayout(id, dto.amount, dto.note, req.user.id);
  }
}

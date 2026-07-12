import { Body, Controller, Get, Param, Post, Put, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CoachingService } from "./coaching.service";
import { CreateCoachProfileDto } from "./dto/create-coach-profile.dto";
import { CreateCoachingRequestDto } from "./dto/create-coaching-request.dto";
import { CounterCoachingRequestDto } from "./dto/counter-coaching-request.dto";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";

@Controller("coaching")
export class CoachingController {
  constructor(private coachingService: CoachingService) {}

  @UseGuards(JwtAuthGuard)
  @Get("coaches")
  findAll() { return this.coachingService.findAll(); }

  @UseGuards(JwtAuthGuard)
  @Get("coaches/:id")
  findOne(@Param("id") id: string) { return this.coachingService.findOne(id); }

  @UseGuards(JwtAuthGuard)
  @Post("coaches/me")
  createProfile(@Request() req: { user: { id: string } }, @Body() dto: CreateCoachProfileDto) { return this.coachingService.createProfile(req.user.id, dto); }

  @UseGuards(JwtAuthGuard)
  @Post("coaches/:id/feedback")
  createFeedback(@Request() req: { user: { id: string } }, @Param("id") id: string, @Body() dto: CreateFeedbackDto) { return this.coachingService.createFeedback(req.user.id, id, dto); }

  @UseGuards(JwtAuthGuard)
  @Get("requests")
  findRequests(@Request() req: { user: { id: string } }) { return this.coachingService.findRequests(req.user.id); }

  @UseGuards(JwtAuthGuard)
  @Post("requests")
  createRequest(@Request() req: { user: { id: string } }, @Body() dto: CreateCoachingRequestDto) { return this.coachingService.createRequest(req.user.id, dto); }

  @UseGuards(JwtAuthGuard)
  @Put("requests/:id/counter")
  counter(@Request() req: { user: { id: string } }, @Param("id") id: string, @Body() dto: CounterCoachingRequestDto) { return this.coachingService.counter(id, req.user.id, dto); }

  @UseGuards(JwtAuthGuard)
  @Put("requests/:id/agree")
  agree(@Request() req: { user: { id: string } }, @Param("id") id: string) { return this.coachingService.agree(id, req.user.id); }

  @UseGuards(JwtAuthGuard)
  @Put("requests/:id/cancel")
  cancel(@Request() req: { user: { id: string } }, @Param("id") id: string) { return this.coachingService.cancel(id, req.user.id); }
}

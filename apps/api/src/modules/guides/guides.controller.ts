import { Controller, Get, Param, Post, Query, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GuidesService } from "./guides.service";

type AuthedRequest = { user: { id: string } };

@Controller("guides")
@UseGuards(JwtAuthGuard)
export class GuidesController {
  constructor(private guides: GuidesService) {}

  @Get()
  list(@Query("position") position?: string) {
    return this.guides.list(position);
  }

  @Get("premium")
  premium(@Request() req: AuthedRequest) {
    return this.guides.premiumStatus(req.user.id);
  }

  @Post("premium")
  buyPremium(@Request() req: AuthedRequest) {
    return this.guides.buyPremium(req.user.id);
  }

  @Get(":champion/:position")
  detail(@Request() req: AuthedRequest, @Param("champion") champion: string, @Param("position") position: string) {
    return this.guides.detail(req.user.id, champion, position);
  }
}

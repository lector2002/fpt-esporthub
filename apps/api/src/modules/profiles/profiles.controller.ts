import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from "@nestjs/common";
import { ProfilesService } from "./profiles.service";
import { OnboardingDto } from "./dto/onboarding.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { parseGame } from "../../common/game";

@Controller("profiles")
export class ProfilesController {
  constructor(private profilesService: ProfilesService) {}

  @UseGuards(JwtAuthGuard)
  @Post("onboarding")
  saveOnboarding(
    @Request() req: { user: { id: string } },
    @Body() dto: OnboardingDto,
  ) {
    return this.profilesService.saveOnboarding(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("dashboard")
  getDashboard(@Request() req: { user: { id: string } }, @Query("game") game?: string) {
    return this.profilesService.getDashboard(req.user.id, parseGame(game));
  }

  @UseGuards(JwtAuthGuard)
  @Get("me/counts")
  getCounts(@Request() req: { user: { id: string } }) {
    return this.profilesService.getCounts(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  getMyProfile(@Request() req: { user: { id: string } }, @Query("game") game?: string) {
    return this.profilesService.getMyProfile(req.user.id, parseGame(game));
  }

  @UseGuards(JwtAuthGuard)
  @Put("me")
  updateMyProfile(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profilesService.updateMyProfile(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":userId")
  getPublicProfile(
    @Request() req: { user: { id: string } },
    @Param("userId") userId: string,
  ) {
    return this.profilesService.getPublicProfile(req.user.id, userId);
  }
}

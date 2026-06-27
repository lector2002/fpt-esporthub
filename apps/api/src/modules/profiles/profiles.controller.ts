import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ProfilesService } from "./profiles.service";
import { OnboardingDto } from "./dto/onboarding.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

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
  @Get("me")
  getMyProfile(@Request() req: { user: { id: string } }) {
    return this.profilesService.getMyProfile(req.user.id);
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
  @Post("riot/verify")
  verifyRiotId(@Request() req: { user: { id: string } }) {
    return this.profilesService.verifyRiotId(req.user.id);
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

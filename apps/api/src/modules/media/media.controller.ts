import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/guards/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AddAchievementDto } from "./dto/add-achievement.dto";
import { MAX_UPLOAD_BYTES } from "./image-pipeline";
import { MediaStorage } from "./media-storage";
import { MediaService } from "./media.service";

type AuthedRequest = { user: { id: string } };

/** Memory only: the buffer goes straight into the image pipeline and never touches disk as uploaded. */
const UPLOAD = FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 } });
/** Per IP, and students often share a campus NAT; the per-owner caps bound disk use. */
const UPLOAD_RATE = { default: { limit: 30, ttl: 60_000 } };

@Controller("media")
export class MediaController {
  constructor(
    private media: MediaService,
    private storage: MediaStorage,
  ) {}

  /** Public like the profiles they sit on. Keys are random and never reused, so caches may keep them forever. */
  @SkipThrottle()
  @Get("files/:key")
  serve(@Param("key") key: string, @Res() res: Response) {
    const path = this.storage.pathOf(key);
    if (!path) throw new NotFoundException();
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.sendFile(path, { headers: { "Content-Type": "image/webp" } }, (error) => {
      if (error && !res.headersSent) res.status(404).end();
    });
  }

  @UseGuards(JwtAuthGuard)
  @Throttle(UPLOAD_RATE)
  @Put("avatar")
  @UseInterceptors(UPLOAD)
  setAvatar(@Request() req: AuthedRequest, @UploadedFile() file?: Express.Multer.File) {
    return this.media.setUserPicture(req.user.id, "avatarKey", file?.buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("avatar")
  clearAvatar(@Request() req: AuthedRequest) {
    return this.media.clearUserPicture(req.user.id, "avatarKey");
  }

  @UseGuards(JwtAuthGuard)
  @Throttle(UPLOAD_RATE)
  @Put("cover")
  @UseInterceptors(UPLOAD)
  setCover(@Request() req: AuthedRequest, @UploadedFile() file?: Express.Multer.File) {
    return this.media.setUserPicture(req.user.id, "coverKey", file?.buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("cover")
  clearCover(@Request() req: AuthedRequest) {
    return this.media.clearUserPicture(req.user.id, "coverKey");
  }

  @UseGuards(JwtAuthGuard)
  @Throttle(UPLOAD_RATE)
  @Put("teams/:teamId/logo")
  @UseInterceptors(UPLOAD)
  setTeamLogo(@Request() req: AuthedRequest, @Param("teamId") teamId: string, @UploadedFile() file?: Express.Multer.File) {
    return this.media.setTeamPicture(teamId, req.user.id, "logoKey", file?.buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("teams/:teamId/logo")
  clearTeamLogo(@Request() req: AuthedRequest, @Param("teamId") teamId: string) {
    return this.media.clearTeamPicture(teamId, req.user.id, "logoKey");
  }

  @UseGuards(JwtAuthGuard)
  @Throttle(UPLOAD_RATE)
  @Put("teams/:teamId/cover")
  @UseInterceptors(UPLOAD)
  setTeamCover(@Request() req: AuthedRequest, @Param("teamId") teamId: string, @UploadedFile() file?: Express.Multer.File) {
    return this.media.setTeamPicture(teamId, req.user.id, "coverKey", file?.buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("teams/:teamId/cover")
  clearTeamCover(@Request() req: AuthedRequest, @Param("teamId") teamId: string) {
    return this.media.clearTeamPicture(teamId, req.user.id, "coverKey");
  }

  @UseGuards(JwtAuthGuard)
  @Throttle(UPLOAD_RATE)
  @Put("communities/:communityId/icon")
  @UseInterceptors(UPLOAD)
  setCommunityIcon(@Request() req: AuthedRequest, @Param("communityId") communityId: string, @UploadedFile() file?: Express.Multer.File) {
    return this.media.setCommunityPicture(communityId, req.user.id, "iconKey", file?.buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("communities/:communityId/icon")
  clearCommunityIcon(@Request() req: AuthedRequest, @Param("communityId") communityId: string) {
    return this.media.clearCommunityPicture(communityId, req.user.id, "iconKey");
  }

  @UseGuards(JwtAuthGuard)
  @Throttle(UPLOAD_RATE)
  @Put("communities/:communityId/cover")
  @UseInterceptors(UPLOAD)
  setCommunityCover(@Request() req: AuthedRequest, @Param("communityId") communityId: string, @UploadedFile() file?: Express.Multer.File) {
    return this.media.setCommunityPicture(communityId, req.user.id, "coverKey", file?.buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("communities/:communityId/cover")
  clearCommunityCover(@Request() req: AuthedRequest, @Param("communityId") communityId: string) {
    return this.media.clearCommunityPicture(communityId, req.user.id, "coverKey");
  }

  @UseGuards(JwtAuthGuard)
  @Throttle(UPLOAD_RATE)
  @Post("achievements")
  @UseInterceptors(UPLOAD)
  addAchievement(@Request() req: AuthedRequest, @Body() dto: AddAchievementDto, @UploadedFile() file?: Express.Multer.File) {
    return this.media.addAchievement(req.user.id, dto, file?.buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("achievements/:id")
  removeAchievement(@Request() req: AuthedRequest, @Param("id") id: string) {
    return this.media.removeAchievement(id, req.user.id);
  }
}

/** Moderation: take down any uploaded picture. */
@Controller("admin/media")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminMediaController {
  constructor(private media: MediaService) {}

  @Delete("users/:id/avatar")
  clearAvatar(@Param("id") id: string) {
    return this.media.clearUserPicture(id, "avatarKey");
  }

  @Delete("users/:id/cover")
  clearCover(@Param("id") id: string) {
    return this.media.clearUserPicture(id, "coverKey");
  }

  @Delete("teams/:id/logo")
  clearTeamLogo(@Param("id") id: string) {
    return this.media.clearTeamPicture(id, null, "logoKey");
  }

  @Delete("teams/:id/cover")
  clearTeamCover(@Param("id") id: string) {
    return this.media.clearTeamPicture(id, null, "coverKey");
  }

  @Delete("communities/:id/icon")
  clearCommunityIcon(@Param("id") id: string) {
    return this.media.clearCommunityPicture(id, null, "iconKey");
  }

  @Delete("communities/:id/cover")
  clearCommunityCover(@Param("id") id: string) {
    return this.media.clearCommunityPicture(id, null, "coverKey");
  }

  @Delete("achievements/:id")
  removeAchievement(@Param("id") id: string) {
    return this.media.removeAchievement(id, null);
  }
}

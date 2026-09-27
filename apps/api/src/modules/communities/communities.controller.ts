import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CommunitiesService } from "./communities.service";
import { CreateChannelDto } from "./dto/create-channel.dto";
import { CreateCommunityDto } from "./dto/create-community.dto";
import { UpdateCommunityDto } from "./dto/update-community.dto";

type AuthedRequest = { user: { id: string } };

@Controller("communities")
@UseGuards(JwtAuthGuard)
export class CommunitiesController {
  constructor(private communities: CommunitiesService) {}

  @Get()
  findAll(@Request() req: AuthedRequest, @Query("game") game?: string, @Query("q") q?: string) {
    return this.communities.findAll(req.user.id, { game, q });
  }

  @Get("mine")
  findMine(@Request() req: AuthedRequest) {
    return this.communities.findMine(req.user.id);
  }

  @Get(":id")
  findOne(@Request() req: AuthedRequest, @Param("id") id: string) {
    return this.communities.findOne(id, req.user.id);
  }

  @Post()
  create(@Request() req: AuthedRequest, @Body() dto: CreateCommunityDto) {
    return this.communities.create(req.user.id, dto);
  }

  @Put(":id")
  update(@Request() req: AuthedRequest, @Param("id") id: string, @Body() dto: UpdateCommunityDto) {
    return this.communities.update(id, req.user.id, dto);
  }

  @Delete(":id")
  remove(@Request() req: AuthedRequest, @Param("id") id: string) {
    return this.communities.remove(id, req.user.id);
  }

  @Post(":id/join")
  @HttpCode(200)
  join(@Request() req: AuthedRequest, @Param("id") id: string) {
    return this.communities.join(id, req.user.id);
  }

  @Post(":id/leave")
  @HttpCode(200)
  leave(@Request() req: AuthedRequest, @Param("id") id: string) {
    return this.communities.leave(id, req.user.id);
  }

  @Post(":id/channels")
  addChannel(@Request() req: AuthedRequest, @Param("id") id: string, @Body() dto: CreateChannelDto) {
    return this.communities.addChannel(id, req.user.id, dto);
  }

  @Delete(":id/channels/:channelId")
  removeChannel(@Request() req: AuthedRequest, @Param("id") id: string, @Param("channelId") channelId: string) {
    return this.communities.removeChannel(id, req.user.id, channelId);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { TeamsService } from "./teams.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

type AuthedRequest = { user: { id: string } };

@Controller("teams")
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Get()
  findAll(
    @Request() req: AuthedRequest,
    @Query("game") game?: string,
    @Query("recruiting") recruiting?: string,
    @Query("role") role?: string,
    @Query("mode") mode?: string,
  ) {
    return this.teamsService.findAll(req.user.id, { game, role, mode, recruiting: recruiting === "true" });
  }

  @Get("mine")
  findMine(@Request() req: AuthedRequest, @Query("game") game?: string) {
    return this.teamsService.findMine(req.user.id, game);
  }

  @Get(":id")
  findOne(@Request() req: AuthedRequest, @Param("id") id: string) {
    return this.teamsService.findOne(id, req.user.id);
  }

  @Post()
  create(@Request() req: AuthedRequest, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(req.user.id, dto);
  }

  @Put(":id")
  update(@Request() req: AuthedRequest, @Param("id") id: string, @Body() dto: UpdateTeamDto) {
    return this.teamsService.update(id, req.user.id, dto);
  }

  @Delete(":id")
  remove(@Request() req: AuthedRequest, @Param("id") id: string) {
    return this.teamsService.remove(id, req.user.id);
  }

  @Post(":id/leave")
  leave(@Request() req: AuthedRequest, @Param("id") id: string) {
    return this.teamsService.leave(id, req.user.id);
  }

  @Delete(":id/members/:userId")
  removeMember(@Request() req: AuthedRequest, @Param("id") id: string, @Param("userId") userId: string) {
    return this.teamsService.removeMember(id, req.user.id, userId);
  }
}

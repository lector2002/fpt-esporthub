import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { TeamsService } from "./teams.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("teams")
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamsService.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query("game") game?: string) {
    return this.teamsService.findAll(game);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.teamsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(":id")
  update(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamsService.update(id, req.user.id, dto);
  }
}

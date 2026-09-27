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
import { TournamentsService } from "./tournaments.service";
import { CreateTournamentDto, UpdateTournamentDto } from "./dto/tournament.dto";
import { OptionalJwtAuthGuard } from "./optional-jwt-auth.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/guards/roles.decorator";

type ViewerRequest = { user?: { id: string } };
type AuthedRequest = { user: { id: string } };

@Controller("tournaments")
export class TournamentsController {
  constructor(private tournamentsService: TournamentsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(@Request() req: ViewerRequest, @Query("game") game?: string, @Query("when") when?: string) {
    return this.tournamentsService.findAll(req.user?.id, game, when);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(":id")
  findOne(@Request() req: ViewerRequest, @Param("id") id: string) {
    return this.tournamentsService.findOne(id, req.user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/interest")
  addInterest(@Request() req: AuthedRequest, @Param("id") id: string) {
    return this.tournamentsService.addInterest(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id/interest")
  removeInterest(@Request() req: AuthedRequest, @Param("id") id: string) {
    return this.tournamentsService.removeInterest(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Post()
  create(@Body() dto: CreateTournamentDto) {
    return this.tournamentsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateTournamentDto) {
    return this.tournamentsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.tournamentsService.remove(id);
  }
}

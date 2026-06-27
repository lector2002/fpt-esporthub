import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { TournamentsService } from "./tournaments.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("tournaments")
export class TournamentsController {
  constructor(private tournamentsService: TournamentsService) {}

  @Get()
  findAll(@Query("game") game?: string) {
    return this.tournamentsService.findAll(game);
  }

  @Get(":id")
  findOne(
    @Param("id") id: string,
    @Request() req: { user?: { id: string } },
  ) {
    return this.tournamentsService.findOne(id, req.user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/interest")
  addInterest(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.tournamentsService.addInterest(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id/interest")
  removeInterest(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.tournamentsService.removeInterest(id, req.user.id);
  }
}

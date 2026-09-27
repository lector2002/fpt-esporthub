import { Module } from "@nestjs/common";
import { TeamsModule } from "../teams/teams.module";
import { TournamentsService } from "./tournaments.service";
import { TournamentsController } from "./tournaments.controller";

@Module({
  imports: [TeamsModule],
  controllers: [TournamentsController],
  providers: [TournamentsService],
})
export class TournamentsModule {}

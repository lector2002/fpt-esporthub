import { Module } from "@nestjs/common";
import { TeamsModule } from "../teams/teams.module";
import { TournamentsService } from "./tournaments.service";
import { AdminEventsController, TournamentsController } from "./tournaments.controller";

@Module({
  imports: [TeamsModule],
  controllers: [TournamentsController, AdminEventsController],
  providers: [TournamentsService],
})
export class TournamentsModule {}

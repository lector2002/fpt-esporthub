import { Module } from "@nestjs/common";
import { OfflineTournamentsService } from "./offline-tournaments.service";
import { BracketPlayService } from "./bracket-play.service";
import { VenuesService } from "./venues.service";
import {
  AdminVenuesController,
  OfflineTournamentsController,
  PublicBracketController,
  VenuesController,
} from "./offline-tournaments.controller";

@Module({
  controllers: [VenuesController, AdminVenuesController, OfflineTournamentsController, PublicBracketController],
  providers: [VenuesService, OfflineTournamentsService, BracketPlayService],
})
export class OfflineTournamentsModule {}

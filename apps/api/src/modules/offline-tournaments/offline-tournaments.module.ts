import { Module } from "@nestjs/common";
import { AdminCupsService } from "./admin-cups.service";
import { OfflineTournamentsService } from "./offline-tournaments.service";
import { BracketPlayService } from "./bracket-play.service";
import { VenuesService } from "./venues.service";
import {
  AdminCupsController,
  AdminVenuesController,
  OfflineTournamentsController,
  PublicBracketController,
  VenuesController,
} from "./offline-tournaments.controller";

@Module({
  controllers: [VenuesController, AdminVenuesController, AdminCupsController, OfflineTournamentsController, PublicBracketController],
  providers: [VenuesService, OfflineTournamentsService, BracketPlayService, AdminCupsService],
})
export class OfflineTournamentsModule {}

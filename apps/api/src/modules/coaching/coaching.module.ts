import { Module } from "@nestjs/common";
import { CreditsModule } from "../credits/credits.module";
import { AdminCoachesController, AdminCoachingPaymentsController, CoachingController } from "./coaching.controller";
import { CoachingSettlementService } from "./coaching-settlement.service";
import { CoachingService } from "./coaching.service";
import { CoachingRequestsService } from "./coaching-requests.service";

@Module({
  imports: [CreditsModule],
  controllers: [CoachingController, AdminCoachesController, AdminCoachingPaymentsController],
  providers: [CoachingService, CoachingRequestsService, CoachingSettlementService],
})
export class CoachingModule {}

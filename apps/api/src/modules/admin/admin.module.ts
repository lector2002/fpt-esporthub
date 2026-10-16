import { Module } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AdminReportsService } from "./admin-reports.service";
import { AdminFeedbackService } from "./admin-feedback.service";
import { AdminFinanceService } from "./admin-finance.service";
import { AdminTeamsService } from "./admin-teams.service";
import { AdminController } from "./admin.controller";

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminReportsService, AdminFeedbackService, AdminFinanceService, AdminTeamsService],
})
export class AdminModule {}

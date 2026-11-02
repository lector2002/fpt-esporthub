import { Module } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AdminActivityService } from "./admin-activity.service";
import { AdminReportsService } from "./admin-reports.service";
import { AdminFeedbackService } from "./admin-feedback.service";
import { AdminFinanceService } from "./admin-finance.service";
import { AdminTeamsService } from "./admin-teams.service";
import { AdminController } from "./admin.controller";

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminActivityService, AdminReportsService, AdminFeedbackService, AdminFinanceService, AdminTeamsService],
})
export class AdminModule {}

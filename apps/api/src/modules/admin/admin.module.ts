import { Module } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AdminReportsService } from "./admin-reports.service";
import { AdminFinanceService } from "./admin-finance.service";
import { AdminTeamsService } from "./admin-teams.service";
import { AdminController } from "./admin.controller";

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminReportsService, AdminFinanceService, AdminTeamsService],
})
export class AdminModule {}

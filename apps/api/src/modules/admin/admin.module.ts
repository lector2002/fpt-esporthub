import { Module } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AdminReportsService } from "./admin-reports.service";
import { AdminController } from "./admin.controller";

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminReportsService],
})
export class AdminModule {}

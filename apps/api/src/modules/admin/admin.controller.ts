import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { UpdateReportDto } from "./dto/update-report.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/guards/roles.decorator";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get("users")
  getUsers(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get("teams")
  getTeams(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.adminService.getTeams(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get("reports")
  getReports(
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.adminService.getReports(
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Put("reports/:id")
  updateReport(
    @Param("id") id: string,
    @Body() dto: UpdateReportDto,
  ) {
    return this.adminService.updateReport(id, dto.status, dto.resolution);
  }

  @Get("tournaments")
  getTournaments(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.adminService.getTournaments(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get("metrics")
  getMetrics() {
    return this.adminService.getMetrics();
  }
}

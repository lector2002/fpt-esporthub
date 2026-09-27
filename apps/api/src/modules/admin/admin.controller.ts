import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AdminReportsService } from "./admin-reports.service";
import { ListReportsQueryDto, ListTeamsQueryDto, ListUsersQueryDto, toPage } from "./dto/admin-query.dto";
import { UpdateReportDto } from "./dto/update-report.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { UpdateRecruitmentDto } from "./dto/update-recruitment.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/guards/roles.decorator";

type AuthedRequest = { user: { id: string } };

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(
    private adminService: AdminService,
    private adminReportsService: AdminReportsService,
  ) {}

  @Get("metrics")
  getMetrics() {
    return this.adminService.getMetrics();
  }

  @Get("users")
  getUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.getUsers(query.q, query.status, toPage(query.page));
  }

  @Put("users/:id/status")
  updateUserStatus(
    @Request() req: AuthedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(req.user.id, id, dto.status, dto.note);
  }

  @Get("reports")
  getReports(@Query() query: ListReportsQueryDto) {
    return this.adminReportsService.getReports(query.status, toPage(query.page));
  }

  @Put("reports/:id")
  updateReport(
    @Request() req: AuthedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateReportDto,
  ) {
    return this.adminReportsService.updateReport(req.user.id, id, dto.status, dto.action ?? "none");
  }

  @Get("teams")
  getTeams(@Query() query: ListTeamsQueryDto) {
    return this.adminService.getTeams(query.q, toPage(query.page));
  }

  @Put("teams/:id/recruitment")
  updateRecruitment(@Param("id") id: string, @Body() dto: UpdateRecruitmentDto) {
    return this.adminService.updateRecruitment(id, dto.recruitmentOpen);
  }
}

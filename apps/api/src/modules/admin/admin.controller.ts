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
import { AdminActivityService } from "./admin-activity.service";
import { AdminFinanceService } from "./admin-finance.service";
import { AdminReportsService } from "./admin-reports.service";
import { AdminFeedbackService } from "./admin-feedback.service";
import { AdminTeamsService } from "./admin-teams.service";
import { ActivityQueryDto, FinanceQueryDto, ListFeedbackQueryDto, ListReportsQueryDto, ListTeamsQueryDto, ListUsersQueryDto, toPage } from "./dto/admin-query.dto";
import { UpdateReportDto } from "./dto/update-report.dto";
import { UpdateFeedbackDto } from "./dto/update-feedback.dto";
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
    private adminActivityService: AdminActivityService,
    private adminReportsService: AdminReportsService,
    private adminFeedbackService: AdminFeedbackService,
    private adminFinanceService: AdminFinanceService,
    private adminTeamsService: AdminTeamsService,
  ) {}

  @Get("activity")
  getActivity(@Query() query: ActivityQueryDto) {
    return this.adminActivityService.getActivity(query.days ?? 30);
  }

  @Get("finance")
  getFinance(@Query() query: FinanceQueryDto) {
    return this.adminFinanceService.getFinance(query.days ?? 30);
  }

  @Get("users")
  getUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.getUsers(query.q, query.status, toPage(query.page));
  }

  @Get("users/:id")
  async getUser(@Param("id") id: string) {
    const user = await this.adminService.getUser(id);
    return { user, money: await this.adminFinanceService.getUserMoney(id) };
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

  @Get("feedback")
  getFeedback(@Query() query: ListFeedbackQueryDto) {
    return this.adminFeedbackService.getFeedback(query, toPage(query.page));
  }

  @Put("feedback/:id")
  updateFeedback(@Param("id") id: string, @Body() dto: UpdateFeedbackDto) {
    return this.adminFeedbackService.updateFeedback(id, dto);
  }

  @Get("teams")
  getTeams(@Query() query: ListTeamsQueryDto) {
    return this.adminService.getTeams(query.q, toPage(query.page));
  }

  @Get("teams/:id")
  getTeam(@Param("id") id: string) {
    return this.adminTeamsService.getTeam(id);
  }

  @Put("teams/:id/recruitment")
  updateRecruitment(@Param("id") id: string, @Body() dto: UpdateRecruitmentDto) {
    return this.adminService.updateRecruitment(id, dto.recruitmentOpen);
  }
}

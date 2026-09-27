import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("reports")
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post()
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateReportDto,
  ) {
    return this.reportsService.create(req.user.id, dto);
  }

  @Get("mine")
  mine(@Request() req: { user: { id: string } }) {
    return this.reportsService.findMine(req.user.id);
  }
}

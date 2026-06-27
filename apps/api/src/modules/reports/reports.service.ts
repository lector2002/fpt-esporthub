import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReportDto } from "./dto/create-report.dto";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async create(reporterId: string, dto: CreateReportDto) {
    if (dto.targetType === "user" && dto.targetId === reporterId) {
      throw new ForbiddenException("Cannot report yourself");
    }

    if (dto.targetType === "user") {
      const target = await this.prisma.user.findUnique({
        where: { id: dto.targetId },
      });
      if (!target) throw new NotFoundException("Reported user not found");
    }

    if (dto.targetType === "team") {
      const team = await this.prisma.team.findUnique({
        where: { id: dto.targetId },
      });
      if (!team) throw new NotFoundException("Reported team not found");
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        reportedUserId: dto.targetType === "user" ? dto.targetId : null,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        description: dto.description ?? null,
      },
    });

    return {
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      status: report.status,
      createdAt: report.createdAt,
    };
  }
}

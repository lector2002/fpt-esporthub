import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PAGE_SIZE, type ReportStatusValue } from "./dto/admin-query.dto";

@Injectable()
export class AdminFeedbackService {
  constructor(private prisma: PrismaService) {}

  async getFeedback(status: ReportStatusValue | undefined, page: number) {
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        select: {
          id: true,
          kind: true,
          message: true,
          page: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
          user: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.feedback.count({ where }),
    ]);
    return { items, total, page, pageSize: PAGE_SIZE };
  }

  async updateFeedback(id: string, status: "REVIEWING" | "RESOLVED" | "DISMISSED") {
    const found = await this.prisma.feedback.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException("Feedback not found");
    const feedback = await this.prisma.feedback.update({
      where: { id },
      data: { status, resolvedAt: status === "REVIEWING" ? null : new Date() },
      select: { id: true, status: true, resolvedAt: true },
    });
    return { feedback };
  }
}

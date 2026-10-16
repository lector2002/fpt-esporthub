import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";

const DAILY_FEEDBACK_LIMIT = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateFeedbackDto) {
    const recent = await this.prisma.feedback.count({
      where: { userId, createdAt: { gte: new Date(Date.now() - DAY_MS) } },
    });
    if (recent >= DAILY_FEEDBACK_LIMIT) {
      throw new HttpException("Daily feedback limit reached. Try again tomorrow.", HttpStatus.TOO_MANY_REQUESTS);
    }

    const feedback = await this.prisma.feedback.create({
      data: { userId, kind: dto.kind, message: dto.message, page: dto.page || null },
      select: { id: true, kind: true, status: true, createdAt: true },
    });
    return { feedback };
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BlocksService {
  constructor(private prisma: PrismaService) {}

  async getMyBlocks(userId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: { id: true, displayName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { blocks };
  }

  async create(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new ForbiddenException("Cannot block yourself");
    }

    const target = await this.prisma.user.findUnique({
      where: { id: blockedId },
    });
    if (!target) throw new NotFoundException("User not found");

    const existing = await this.prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });

    if (existing) {
      throw new ConflictException("User already blocked");
    }

    const block = await this.prisma.block.create({
      data: { blockerId, blockedId },
      include: {
        blocked: { select: { id: true, displayName: true } },
      },
    });

    return { block };
  }

  async remove(blockerId: string, blockedId: string) {
    const existing = await this.prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });

    if (!existing) {
      throw new NotFoundException("Block not found");
    }

    await this.prisma.block.delete({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });

    return { success: true };
  }
}

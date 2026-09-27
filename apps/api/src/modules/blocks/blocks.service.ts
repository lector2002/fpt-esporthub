import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CallService } from "../realtime/call.service";

const BLOCK_SELECT = {
  createdAt: true,
  blocked: { select: { id: true, displayName: true } },
} as const;

type BlockRow = { createdAt: Date; blocked: { id: string; displayName: string } };

function toBlockedUser(block: BlockRow) {
  return {
    userId: block.blocked.id,
    displayName: block.blocked.displayName,
    blockedAt: block.createdAt,
  };
}

@Injectable()
export class BlocksService {
  constructor(
    private prisma: PrismaService,
    private calls: CallService,
  ) {}

  async getMyBlocks(userId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: userId },
      select: BLOCK_SELECT,
      orderBy: { createdAt: "desc" },
    });
    return { blocks: blocks.map(toBlockedUser) };
  }

  /** Idempotent: blocking an already blocked user returns the existing block. */
  async create(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException("You cannot block yourself");
    }

    const target = await this.prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException("User not found");

    const block = await this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
      select: BLOCK_SELECT,
    });
    this.calls.endCallsBetween(blockerId, blockedId);
    return { block: toBlockedUser(block) };
  }

  /** Idempotent: unblocking a user who is not blocked succeeds. */
  async remove(blockerId: string, blockedId: string) {
    await this.prisma.block.deleteMany({ where: { blockerId, blockedId } });
    return { success: true };
  }
}

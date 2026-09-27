import type { PrismaService } from "../prisma/prisma.service";

/** True if `userId` and any of `otherIds` have a Block in either direction. */
export async function hasBlockWith(prisma: PrismaService, userId: string, otherIds: string[]) {
  if (otherIds.length === 0) return false;
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: { in: otherIds } },
        { blockerId: { in: otherIds }, blockedId: userId },
      ],
    },
    select: { id: true },
  });
  return Boolean(block);
}

/** True if any of `otherIds` blocked `userId`. */
export async function isBlockedByAny(prisma: PrismaService, userId: string, otherIds: string[]) {
  if (otherIds.length === 0) return false;
  const count = await prisma.block.count({ where: { blockerId: { in: otherIds }, blockedId: userId } });
  return count > 0;
}

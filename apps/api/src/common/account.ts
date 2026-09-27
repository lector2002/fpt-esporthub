import { ForbiddenException } from "@nestjs/common";
import type { PrismaService } from "../modules/prisma/prisma.service";

/** Restricted and banned accounts can read but not start contact (requests, messages). */
export async function assertCanInteract(prisma: PrismaService, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (!user || user.status === "RESTRICTED" || user.status === "BANNED") {
    throw new ForbiddenException("Your account is restricted from contacting other players");
  }
}

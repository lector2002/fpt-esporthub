import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";

/** An admin may moderate any user except themselves and other admins. */
export async function findModeratableUser(prisma: PrismaService, actorId: string, userId: string) {
  if (actorId === userId) {
    throw new BadRequestException("You cannot change your own status");
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true },
  });
  if (!user) throw new NotFoundException("User not found");
  if (user.role === "ADMIN") {
    throw new ForbiddenException("Admins cannot be moderated");
  }
  return user;
}

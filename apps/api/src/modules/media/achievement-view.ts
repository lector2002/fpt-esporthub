import type { PrismaService } from "../prisma/prisma.service";

export const MAX_ACHIEVEMENTS = 6;

export const ACHIEVEMENT_SELECT = { id: true, title: true, imageKey: true, createdAt: true } as const;

type AchievementOwner = { userId: string } | { teamId: string } | { coachProfileId: string };

/** Newest first, for the gallery on a profile, team or coach page. */
export function listAchievements(db: Pick<PrismaService, "achievement">, owner: AchievementOwner) {
  return db.achievement.findMany({ where: owner, select: ACHIEVEMENT_SELECT, orderBy: { createdAt: "desc" } });
}

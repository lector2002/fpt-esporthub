import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { assertCanInteract } from "../../common/account";
import { CreditsService } from "../credits/credits.service";
import { PrismaService } from "../prisma/prisma.service";
import { type GuideData, POSITIONS, type Position, freeTier, lockedCounts } from "./guide-data";
import { PREMIUM_PASS, extendPremium, hasPremium } from "./premium";

const SUMMARY_SELECT = { champion: true, position: true, patch: true, winRate: true, pickRate: true, banRate: true, fetchedAt: true } as const;

function parsePosition(value: string | undefined): Position | undefined {
  if (value === undefined || value === "") return undefined;
  if (!(POSITIONS as readonly string[]).includes(value)) throw new BadRequestException("Unknown position");
  return value as Position;
}

@Injectable()
export class GuidesService {
  constructor(
    private prisma: PrismaService,
    private credits: CreditsService,
  ) {}

  async list(position?: string) {
    const where = { position: parsePosition(position) };
    const guides = await this.prisma.buildGuide.findMany({ where, select: SUMMARY_SELECT, orderBy: [{ pickRate: "desc" }, { champion: "asc" }] });
    return { guides };
  }

  async detail(userId: string, champion: string, position: string) {
    const [guide, user, siblings] = await Promise.all([
      this.prisma.buildGuide.findFirst({
        where: { champion, position: parsePosition(position) },
        select: { ...SUMMARY_SELECT, source: true, sourceUrl: true, data: true },
        orderBy: { fetchedAt: "desc" },
      }),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { premiumUntil: true } }),
      this.prisma.buildGuide.findMany({ where: { champion }, select: { position: true, pickRate: true }, distinct: ["position"] }),
    ]);
    if (!guide) throw new NotFoundException("Guide not found");
    const { data, ...header } = guide;
    const full = data as unknown as GuideData;
    const unlocked = hasPremium(user.premiumUntil);
    return {
      guide: header,
      free: freeTier(full),
      // Premium sections are only sent to pass holders.
      premium: unlocked ? full : null,
      locked: unlocked ? null : lockedCounts(full),
      // Other positions with a guide for this champion, most played first.
      positions: siblings.sort((a, b) => (b.pickRate ?? 0) - (a.pickRate ?? 0)).map((row) => row.position),
      premiumUntil: unlocked ? user.premiumUntil : null,
    };
  }

  async premiumStatus(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { premiumUntil: true } });
    return { premiumUntil: hasPremium(user.premiumUntil) ? user.premiumUntil : null, price: PREMIUM_PASS };
  }

  async buyPremium(userId: string) {
    await assertCanInteract(this.prisma, userId);
    const bought = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { premiumUntil: true } });
      const { balance } = await this.credits.apply(
        { userId, amount: -PREMIUM_PASS.credits, kind: "GUIDE", ref: `guide-pass:${randomUUID()}`, note: `${PREMIUM_PASS.days}-day guides premium` },
        tx,
      );
      const updated = await tx.user.update({ where: { id: userId }, data: { premiumUntil: extendPremium(user.premiumUntil) }, select: { premiumUntil: true } });
      return { premiumUntil: updated.premiumUntil, balance };
    });
    this.credits.notifyBalance(userId);
    return bought;
  }
}

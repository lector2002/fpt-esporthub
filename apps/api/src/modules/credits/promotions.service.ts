import { randomUUID } from "node:crypto";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { assertCanInteract } from "../../common/account";
import { parseGame } from "../../common/game";
import { PrismaService } from "../prisma/prisma.service";
import { CreditsService } from "./credits.service";
import { PROMOTIONS, extendPromotion } from "./promotion";

@Injectable()
export class PromotionsService {
  constructor(
    private prisma: PrismaService,
    private credits: CreditsService,
  ) {}

  async boostProfile(userId: string, gameSlug: string) {
    const game = parseGame(gameSlug);
    if (!game) throw new BadRequestException("game is required");
    await assertCanInteract(this.prisma, userId);
    const { credits, hours } = PROMOTIONS.boost;
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.playerProfile.findUnique({ where: { userId_game: { userId, game } }, select: { id: true, boostedUntil: true } });
      if (!profile) throw new NotFoundException("Create a profile for this game first");
      const { balance } = await this.credits.apply({ userId, amount: -credits, kind: "BOOST", ref: `boost:${randomUUID()}`, note: `${hours}h Find Match boost` }, tx);
      const updated = await tx.playerProfile.update({
        where: { id: profile.id },
        data: { boostedUntil: extendPromotion(profile.boostedUntil, hours) },
        select: { boostedUntil: true },
      });
      return { boostedUntil: updated.boostedUntil, balance };
    });
  }

  async featureTeam(userId: string, teamId: string) {
    await assertCanInteract(this.prisma, userId);
    const { credits, hours } = PROMOTIONS.feature;
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.findUnique({ where: { id: teamId }, select: { captainId: true, featuredUntil: true, recruitmentOpen: true } });
      if (!team) throw new NotFoundException("Team not found");
      if (team.captainId !== userId) throw new ForbiddenException("Only the team captain can do this");
      if (!team.recruitmentOpen) throw new BadRequestException("Open recruitment before featuring the team");
      const { balance } = await this.credits.apply({ userId, amount: -credits, kind: "FEATURE", ref: `feature:${randomUUID()}`, note: `${hours}h featured recruitment` }, tx);
      const updated = await tx.team.update({
        where: { id: teamId },
        data: { featuredUntil: extendPromotion(team.featuredUntil, hours) },
        select: { featuredUntil: true },
      });
      return { featuredUntil: updated.featuredUntil, balance };
    });
  }
}

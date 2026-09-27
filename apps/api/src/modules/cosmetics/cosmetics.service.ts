import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { assertCanInteract } from "../../common/account";
import { CreditsService } from "../credits/credits.service";
import { PrismaService } from "../prisma/prisma.service";
import { COSMETICS, EQUIPPED_FIELD, EQUIPPED_SELECT, type CosmeticKind, findCosmetic, toCosmeticsView } from "./catalog";

@Injectable()
export class CosmeticsService {
  constructor(
    private prisma: PrismaService,
    private credits: CreditsService,
  ) {}

  async getMine(userId: string) {
    const [user, owned] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { ...EQUIPPED_SELECT, creditBalance: true } }),
      this.prisma.userCosmetic.findMany({ where: { userId }, select: { itemId: true } }),
    ]);
    return {
      catalog: COSMETICS,
      owned: owned.map((row) => row.itemId).filter((id) => findCosmetic(id)),
      equipped: toCosmeticsView(user),
      balance: user.creditBalance,
    };
  }

  /** One purchase per item per user; the new item is equipped right away. */
  async buy(userId: string, itemId: string) {
    const item = findCosmetic(itemId);
    if (!item) throw new NotFoundException("Item not found");
    await assertCanInteract(this.prisma, userId);
    await this.prisma.$transaction(async (tx) => {
      const owned = await tx.userCosmetic.findUnique({ where: { userId_itemId: { userId, itemId } }, select: { id: true } });
      if (owned) throw new ConflictException("You already own this item");
      const spent = await this.credits.apply({ userId, amount: -item.credits, kind: "COSMETIC", ref: `cosmetic:${userId}:${itemId}`, note: itemId }, tx);
      if (!spent.applied) throw new ConflictException("You already own this item");
      await tx.userCosmetic.create({ data: { userId, itemId } });
      await tx.user.update({ where: { id: userId }, data: { [EQUIPPED_FIELD[item.kind]]: itemId } });
    });
    return this.getMine(userId);
  }

  /** `itemId: null` takes the slot off. */
  async equip(userId: string, kind: CosmeticKind, itemId: string | null) {
    if (itemId !== null) {
      const item = findCosmetic(itemId);
      if (!item || item.kind !== kind) throw new BadRequestException("That item doesn't fit this slot");
      const owned = await this.prisma.userCosmetic.findUnique({ where: { userId_itemId: { userId, itemId } }, select: { id: true } });
      if (!owned) throw new ForbiddenException("Buy this item first");
    }
    await this.prisma.user.update({ where: { id: userId }, data: { [EQUIPPED_FIELD[kind]]: itemId } });
    return this.getMine(userId);
  }
}

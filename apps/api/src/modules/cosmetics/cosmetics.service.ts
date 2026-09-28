import { randomInt, randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { assertCanInteract } from "../../common/account";
import { isDuplicateRef } from "../credits/credit-ledger";
import { CreditsService } from "../credits/credits.service";
import { PrismaService } from "../prisma/prisma.service";
import { COSMETICS, EQUIPPED_FIELD, EQUIPPED_SELECT, type CosmeticKind, findCosmetic, toCosmeticsView } from "./catalog";
import { GACHA_PRICE, gachaRates, pickFromPool } from "./gacha";

@Injectable()
export class CosmeticsService {
  constructor(
    private prisma: PrismaService,
    private credits: CreditsService,
  ) {}

  async getMine(userId: string) {
    const [user, rows] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { ...EQUIPPED_SELECT, creditBalance: true } }),
      this.prisma.userCosmetic.findMany({ where: { userId }, select: { itemId: true } }),
    ]);
    const owned = rows.map((row) => row.itemId).filter((id) => findCosmetic(id));
    const pool = COSMETICS.filter((item) => !owned.includes(item.id));
    return {
      catalog: COSMETICS,
      owned,
      equipped: toCosmeticsView(user),
      balance: user.creditBalance,
      gacha: { price: GACHA_PRICE, remaining: pool.length, rates: gachaRates(pool) },
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
    this.credits.notifyBalance(userId);
    return this.getMine(userId);
  }

  /** Mystery box: a random item the player doesn't own yet, never a duplicate. Not equipped; the reveal offers that. */
  async pull(userId: string) {
    await assertCanInteract(this.prisma, userId);
    try {
      const item = await this.prisma.$transaction(async (tx) => {
        const rows = await tx.userCosmetic.findMany({ where: { userId }, select: { itemId: true } });
        const pool = COSMETICS.filter((candidate) => !rows.some((row) => row.itemId === candidate.id));
        const picked = pickFromPool(pool, randomInt);
        if (!picked) throw new ConflictException("You already own everything in the box");
        await this.credits.apply({ userId, amount: -GACHA_PRICE, kind: "COSMETIC", ref: `gacha:${randomUUID()}`, note: `gacha ${picked.id}` }, tx);
        // Unique (userId, itemId): a concurrent pull that drew the same item rolls this one back, credits included.
        await tx.userCosmetic.create({ data: { userId, itemId: picked.id } });
        return picked;
      });
      this.credits.notifyBalance(userId);
      return { item, shop: await this.getMine(userId) };
    } catch (error) {
      if (isDuplicateRef(error)) throw new ConflictException("Another pull just finished, try again");
      throw error;
    }
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

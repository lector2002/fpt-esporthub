import { randomInt, randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { assertCanInteract } from "../../common/account";
import { isDuplicateRef } from "../credits/credit-ledger";
import { CreditsService } from "../credits/credits.service";
import { PrismaService } from "../prisma/prisma.service";
import { COSMETICS, EQUIPPED_FIELD, EQUIPPED_SELECT, type CosmeticKind, findCosmetic, toCosmeticsView } from "./catalog";
import { GACHA_BANNERS, GACHA_BATCH, GACHA_PRICE, bannerPool, gachaRates, pickBatch } from "./gacha";

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
    const banners = GACHA_BANNERS.map((banner) => {
      const pool = bannerPool(banner, owned);
      return { id: banner.id, featured: banner.featured, remaining: pool.length, rates: gachaRates(pool) };
    });
    return {
      catalog: COSMETICS,
      owned,
      equipped: toCosmeticsView(user),
      balance: user.creditBalance,
      gacha: { price: GACHA_PRICE, batch: GACHA_BATCH, banners },
    };
  }

  /** One purchase per item per user; the new item is equipped right away. */
  async buy(userId: string, itemId: string) {
    const item = findCosmetic(itemId);
    if (!item) throw new NotFoundException("Item not found");
    if (item.limited) throw new BadRequestException("This item only drops from its limited banner");
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

  /**
   * Mystery box: `count` random items (1 or a batch) from the banner's pool that the player doesn't own yet, never a
   * duplicate. Not equipped; the reveal offers that. A batch holds a rare or better while the box has one (`pickBatch`).
   */
  async pull(userId: string, bannerId: string, count: number) {
    const banner = GACHA_BANNERS.find((candidate) => candidate.id === bannerId);
    if (!banner) throw new NotFoundException("Banner not found");
    await assertCanInteract(this.prisma, userId);
    try {
      const items = await this.prisma.$transaction(async (tx) => {
        const rows = await tx.userCosmetic.findMany({ where: { userId }, select: { itemId: true } });
        const pool = bannerPool(banner, rows.map((row) => row.itemId));
        const picked = pickBatch(pool, count, randomInt);
        if (!picked) throw new ConflictException(pool.length === 0 ? "You already own everything in the box" : `Only ${pool.length} items are left in the box`);
        const note = `gacha ${banner.id} ${picked.map((item) => item.id).join(" ")}`;
        await this.credits.apply({ userId, amount: -GACHA_PRICE * count, kind: "COSMETIC", ref: `gacha:${randomUUID()}`, note }, tx);
        // Unique (userId, itemId): a concurrent pull that drew the same item rolls this one back, credits included.
        await tx.userCosmetic.createMany({ data: picked.map((item) => ({ userId, itemId: item.id })) });
        return picked;
      });
      this.credits.notifyBalance(userId);
      return { items, shop: await this.getMine(userId) };
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

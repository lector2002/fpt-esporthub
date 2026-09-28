import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeService } from "../realtime/realtime.service";
import { CREDIT_VND, TOPUP_MAX, TOPUP_MIN, TOPUP_PACKAGES, creditsCoachingEnabled, topUpPackage } from "./credit-pricing";
import { InsufficientCreditsError, applyCredit, isDuplicateRef, type LedgerEntry } from "./credit-ledger";
import { PAYMENT_PROVIDER, type PaymentProvider } from "./payment-provider";
import { PROMOTIONS } from "./promotion";

const HISTORY_LIMIT = 30;
const TOPUP_SELECT = { orderCode: true, credits: true, amountVnd: true, status: true, checkoutUrl: true, createdAt: true, paidAt: true } as const;
const TX_SELECT = { id: true, amount: true, balanceAfter: true, kind: true, note: true, createdAt: true } as const;

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeService,
    @Inject(PAYMENT_PROVIDER) private provider: PaymentProvider | null,
  ) {}

  /** Tells the user's open tabs to reload their balance. Call only after the change has committed. */
  notifyBalance(userId: string) {
    this.realtime.emitToUser(userId, "credits:changed", {});
  }

  async getMine(userId: string) {
    const [user, transactions, topUps] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { creditBalance: true } }),
      this.prisma.creditTransaction.findMany({ where: { userId }, select: TX_SELECT, orderBy: { createdAt: "desc" }, take: HISTORY_LIMIT }),
      this.prisma.creditTopUp.findMany({ where: { userId }, select: TOPUP_SELECT, orderBy: { createdAt: "desc" }, take: 10 }),
    ]);
    return {
      balance: user.creditBalance,
      transactions,
      topUps,
      packages: TOPUP_PACKAGES.map((credits) => topUpPackage(credits)!),
      customTopUp: { min: TOPUP_MIN, max: TOPUP_MAX, creditVnd: CREDIT_VND },
      promotions: PROMOTIONS,
      coachingInCredits: creditsCoachingEnabled(),
      provider: this.provider?.name ?? null,
    };
  }

  async createTopUp(userId: string, credits: number) {
    const provider = this.requireProvider();
    const pack = topUpPackage(credits);
    if (!pack) throw new BadRequestException("Unknown package");
    const topUp = await this.prisma.creditTopUp.create({
      data: { userId, credits: pack.credits, amountVnd: pack.amountVnd, provider: provider.name },
      select: { id: true, orderCode: true },
    });
    const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
    try {
      const checkout = await provider.createCheckout({
        orderCode: topUp.orderCode,
        amountVnd: pack.amountVnd,
        // payOS caps this at 9 characters on bank accounts not linked through payOS; it shows on the buyer's transfer.
        description: `EH${topUp.orderCode}`,
        returnUrl: `${webOrigin}/wallet?topup=${topUp.orderCode}`,
        cancelUrl: `${webOrigin}/wallet?topup=${topUp.orderCode}`,
      });
      const saved = await this.prisma.creditTopUp.update({
        where: { id: topUp.id },
        data: { checkoutUrl: checkout.checkoutUrl, paymentLinkId: checkout.paymentLinkId },
        select: TOPUP_SELECT,
      });
      return { topUp: saved };
    } catch {
      await this.prisma.creditTopUp.update({ where: { id: topUp.id }, data: { status: "CANCELLED" } });
      throw new ServiceUnavailableException("Payment is unavailable right now. Try again later.");
    }
  }

  /** Status for the return page. A pending payOS order is checked with payOS, so a missed webhook still credits. */
  async getTopUp(userId: string, orderCode: number) {
    const topUp = await this.findOwnTopUp(userId, orderCode);
    if (topUp.status === "PENDING" && this.provider?.name === "payos" && topUp.provider === "payos") {
      const remote = await this.provider.getStatus(orderCode).catch(() => null);
      if (remote?.status === "PAID") await this.settle(orderCode, remote.amountVnd);
      if (remote?.status === "CANCELLED") {
        await this.prisma.creditTopUp.updateMany({ where: { orderCode, status: "PENDING" }, data: { status: "CANCELLED" } });
      }
    }
    return { topUp: await this.prisma.creditTopUp.findUniqueOrThrow({ where: { orderCode }, select: TOPUP_SELECT }) };
  }

  /** Always answers 200 for a well-formed call, so payOS's webhook check and retries don't loop. */
  async handleWebhook(body: unknown) {
    const payment = this.provider?.readWebhook(body) ?? null;
    if (!payment) return { success: false };
    const known = await this.prisma.creditTopUp.findUnique({ where: { orderCode: payment.orderCode }, select: { id: true } });
    if (known) await this.settle(payment.orderCode, payment.amountVnd);
    return { success: true };
  }

  /** Dev checkout page: the mock provider's "Pay" button. */
  async mockPay(userId: string, orderCode: number) {
    if (this.provider?.name !== "mock") throw new NotFoundException();
    const topUp = await this.findOwnTopUp(userId, orderCode);
    if (topUp.provider !== "mock") throw new NotFoundException();
    await this.settle(orderCode, topUp.amountVnd);
    return this.getTopUp(userId, orderCode);
  }

  async mockCancel(userId: string, orderCode: number) {
    if (this.provider?.name !== "mock") throw new NotFoundException();
    await this.findOwnTopUp(userId, orderCode);
    await this.prisma.creditTopUp.updateMany({ where: { orderCode, status: "PENDING" }, data: { status: "CANCELLED" } });
    return this.getTopUp(userId, orderCode);
  }

  /**
   * Spends or refunds credits for an app feature. Throws ConflictException when the balance is short.
   * Pass `tx` to join a caller's transaction; the caller then calls `notifyBalance` once it commits.
   */
  async apply(entry: LedgerEntry, tx?: Parameters<typeof applyCredit>[0]) {
    try {
      if (tx) return await applyCredit(tx, entry);
      const result = await this.prisma.$transaction((inner) => applyCredit(inner, entry));
      if (result.applied) this.notifyBalance(entry.userId);
      return result;
    } catch (error) {
      if (error instanceof InsufficientCreditsError) throw new ConflictException("Not enough credits. Top up in your wallet.");
      if (isDuplicateRef(error)) return { applied: false, balance: null };
      throw error;
    }
  }

  adminList(userId: string | undefined) {
    return this.prisma.creditTransaction.findMany({
      where: userId ? { userId } : {},
      select: { ...TX_SELECT, ref: true, user: { select: { id: true, displayName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async adminAdjust(adminId: string, userId: string, amount: number, note: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException("User not found");
    const result = await this.apply({ userId, amount, kind: "ADJUSTMENT", ref: `adjust:${randomUUID()}`, note: `${note.trim()} (by ${adminId})` });
    return { balance: result.balance };
  }

  /** Marks the order paid and credits it once. The amount must match what we asked for. */
  private async settle(orderCode: number, paidVnd: number) {
    try {
      const creditedUserId = await this.prisma.$transaction(async (tx) => {
        const topUp = await tx.creditTopUp.findUniqueOrThrow({ where: { orderCode } });
        if (paidVnd !== topUp.amountVnd) {
          this.logger.warn(`Top-up ${orderCode}: paid ${paidVnd} VND, expected ${topUp.amountVnd}; not credited`);
          return null;
        }
        // Cancelled orders are included: money that did arrive is always credited.
        const marked = await tx.creditTopUp.updateMany({
          where: { orderCode, status: { in: ["PENDING", "CANCELLED"] } },
          data: { status: "PAID", paidAt: new Date() },
        });
        if (marked.count === 0) return null;
        await applyCredit(tx, { userId: topUp.userId, amount: topUp.credits, kind: "TOPUP", ref: `topup:${orderCode}`, note: `${topUp.amountVnd} VND` });
        return topUp.userId;
      });
      if (creditedUserId) this.notifyBalance(creditedUserId);
    } catch (error) {
      if (!isDuplicateRef(error)) throw error;
    }
  }

  private async findOwnTopUp(userId: string, orderCode: number) {
    const topUp = await this.prisma.creditTopUp.findUnique({ where: { orderCode } });
    if (!topUp || topUp.userId !== userId) throw new NotFoundException("Top-up not found");
    return topUp;
  }

  private requireProvider() {
    if (!this.provider) throw new ServiceUnavailableException("Top-up is not available yet");
    return this.provider;
  }
}

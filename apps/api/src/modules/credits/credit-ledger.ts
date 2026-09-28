import type { CreditTxKind, Prisma } from "@fpt-esporthub/database";

export class InsufficientCreditsError extends Error {
  constructor() {
    super("Not enough credits");
  }
}

export interface LedgerEntry {
  userId: string;
  /** Positive = credits in, negative = spent or held. */
  amount: number;
  kind: CreditTxKind;
  /** Idempotency key: the same ref never moves credits twice. */
  ref: string;
  note?: string;
  /** Credits in: reward credits, spendable but never refunded or used for coaching. */
  locked?: true;
  /** Credits out: only paid credits may be used (coaching holds, which end up in a coach's payout). */
  paidOnly?: true;
}

/** How one entry changes the user row: `lockedChange` is floored at 0, so a spend burns reward credits first. */
export function balanceChange(entry: LedgerEntry) {
  if (entry.amount > 0) return { amount: entry.amount, lockedChange: entry.locked ? entry.amount : 0, need: 0, paidOnly: false };
  return { amount: entry.amount, lockedChange: entry.paidOnly ? 0 : entry.amount, need: -entry.amount, paidOnly: Boolean(entry.paidOnly) };
}

/**
 * Moves credits and records the movement. Call inside a transaction: if the ref is taken by a concurrent call,
 * the insert fails and the whole transaction, balance change included, rolls back.
 * Returns `applied: false` when this ref was already recorded.
 */
export async function applyCredit(tx: Prisma.TransactionClient, entry: LedgerEntry) {
  if (!Number.isInteger(entry.amount) || entry.amount === 0) throw new Error("Credit amount must be a non-zero integer");
  const existing = await tx.creditTransaction.findUnique({ where: { ref: entry.ref }, select: { balanceAfter: true } });
  if (existing) return { applied: false, balance: existing.balanceAfter };

  // The balance check and the change are one statement, so two spends can't both pass the check.
  const change = balanceChange(entry);
  const updated = await tx.$executeRaw`
    UPDATE "User" SET "creditBalance" = "creditBalance" + ${change.amount},
      "lockedCredits" = GREATEST("lockedCredits" + ${change.lockedChange}, 0), "updatedAt" = NOW()
    WHERE id = ${entry.userId} AND "creditBalance" - (CASE WHEN ${change.paidOnly} THEN "lockedCredits" ELSE 0 END) >= ${change.need}`;
  if (updated === 0) throw new InsufficientCreditsError();

  const { creditBalance, lockedCredits } = await tx.user.findUniqueOrThrow({ where: { id: entry.userId }, select: { creditBalance: true, lockedCredits: true } });
  await tx.creditTransaction.create({
    data: { userId: entry.userId, amount: entry.amount, kind: entry.kind, ref: entry.ref, note: entry.note, balanceAfter: creditBalance, lockedAfter: lockedCredits },
  });
  return { applied: true, balance: creditBalance };
}

/** True for Prisma's unique-constraint error, i.e. a concurrent call recorded the same ref first. */
export function isDuplicateRef(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

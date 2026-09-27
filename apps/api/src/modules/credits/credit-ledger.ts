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
  const spend = entry.amount < 0 ? { creditBalance: { gte: -entry.amount } } : {};
  const updated = await tx.user.updateMany({ where: { id: entry.userId, ...spend }, data: { creditBalance: { increment: entry.amount } } });
  if (updated.count === 0) throw new InsufficientCreditsError();

  const { creditBalance } = await tx.user.findUniqueOrThrow({ where: { id: entry.userId }, select: { creditBalance: true } });
  await tx.creditTransaction.create({
    data: { userId: entry.userId, amount: entry.amount, kind: entry.kind, ref: entry.ref, note: entry.note, balanceAfter: creditBalance },
  });
  return { applied: true, balance: creditBalance };
}

/** True for Prisma's unique-constraint error, i.e. a concurrent call recorded the same ref first. */
export function isDuplicateRef(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

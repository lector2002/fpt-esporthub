export type CreditTxKind = "TOPUP" | "BOOST" | "FEATURE" | "COSMETIC" | "GUIDE" | "COACHING_HOLD" | "COACHING_REFUND" | "ADJUSTMENT";

export interface CreditTransaction {
  id: string;
  amount: number;
  balanceAfter: number;
  kind: CreditTxKind;
  note: string | null;
  createdAt: string;
}

export interface TopUp {
  orderCode: number;
  credits: number;
  amountVnd: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  checkoutUrl: string | null;
  createdAt: string;
  paidAt: string | null;
}

interface Promotion {
  credits: number;
  hours: number;
}

/** GET /credits/me */
export interface Wallet {
  balance: number;
  transactions: CreditTransaction[];
  topUps: TopUp[];
  packages: { credits: number; amountVnd: number }[];
  /** Limits for a typed-in amount; the server prices it at creditVnd per credit. */
  customTopUp: { min: number; max: number; creditVnd: number };
  promotions: { boost: Promotion; feature: Promotion };
  /** Null = top-up turned off on this server. */
  provider: "payos" | "mock" | null;
  coachingInCredits: boolean;
}

export interface AdminCreditTransaction extends CreditTransaction {
  ref: string;
  user: { id: string; displayName: string; email: string };
}

export interface CoachingPayments {
  coaches: { id: string; payableCredits: number; user: { id: string; displayName: string; email: string } }[];
  disputes: {
    id: string;
    creditHold: number | null;
    proposedStartAt: string;
    durationMinutes: number;
    player: { id: string; displayName: string };
    coach: { id: string; user: { displayName: string } };
  }[];
}

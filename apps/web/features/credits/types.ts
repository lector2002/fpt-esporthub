export type CreditTxKind = "TOPUP" | "BOOST" | "FEATURE" | "COSMETIC" | "GUIDE" | "COACHING_HOLD" | "COACHING_REFUND" | "ADJUSTMENT" | "REWARD";

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
  /** Reward part of the balance: spent first, can't be withdrawn, refunded or used for coaching. */
  locked: number;
  rewards: Rewards;
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

/** Login rewards: check-in streak (0 = broken or never started), their rules and the first top-up pet. */
export interface Rewards {
  streak: number;
  checkedInToday: boolean;
  rules: { daily: number; every: number; bonus: number };
  firstTopUpPet: { id: string; owned: boolean };
}

/** POST /credits/check-in. `claimed` = today's reward was just given (first visit of the Vietnam day). */
export interface CheckIn extends Rewards {
  claimed: boolean;
  /** Today's reward, bonus included. */
  reward: number;
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

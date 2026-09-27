import "../../env";

/** Every price lives here, on the server. Clients send a package or product id, never an amount. */

export const CREDIT_VND = 1000;

/** Top-up packages in credits. */
export const TOPUP_PACKAGES = [20, 50, 100, 200, 500] as const;

export function topUpPackage(credits: number) {
  return (TOPUP_PACKAGES as readonly number[]).includes(credits) ? { credits, amountVnd: credits * CREDIT_VND } : null;
}

/** Credits for a coaching price in VND, rounded up so a session never costs less than its price. */
export function creditsForVnd(amountVnd: number) {
  return Math.ceil(amountVnd / CREDIT_VND);
}

/** Coaching paid in credits. Off unless CREDITS_COACHING=true: paying coaches out needs an SBV licence or a licensed partner. */
export function creditsCoachingEnabled() {
  return process.env.CREDITS_COACHING === "true";
}

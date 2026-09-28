import "../../env";

/** Every price lives here, on the server. Clients send a number of credits or a product id, never a price. */

export const CREDIT_VND = 1000;

/** Top-up presets in credits; any whole number of credits from TOPUP_MIN to TOPUP_MAX can be bought too. */
export const TOPUP_PACKAGES = [20, 50, 100, 200, 500] as const;
export const TOPUP_MIN = 10;
export const TOPUP_MAX = 2000;

export function topUpPackage(credits: number) {
  return Number.isInteger(credits) && credits >= TOPUP_MIN && credits <= TOPUP_MAX ? { credits, amountVnd: credits * CREDIT_VND } : null;
}

/** Credits for a coaching price in VND, rounded up so a session never costs less than its price. */
export function creditsForVnd(amountVnd: number) {
  return Math.ceil(amountVnd / CREDIT_VND);
}

/** Coaching paid in credits. Off unless CREDITS_COACHING=true: paying coaches out needs an SBV licence or a licensed partner. */
export function creditsCoachingEnabled() {
  return process.env.CREDITS_COACHING === "true";
}

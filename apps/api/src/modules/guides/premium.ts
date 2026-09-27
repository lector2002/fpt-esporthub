/** Build guides premium pass: one price unlocks every premium section for 30 days; buying again adds 30 days. */
export const PREMIUM_PASS = { credits: 49, days: 30 } as const;

export function hasPremium(until: Date | null | undefined, now = new Date()) {
  return Boolean(until && until > now);
}

export function extendPremium(until: Date | null | undefined, now = new Date()) {
  const from = hasPremium(until, now) ? until! : now;
  return new Date(from.getTime() + PREMIUM_PASS.days * 86_400_000);
}

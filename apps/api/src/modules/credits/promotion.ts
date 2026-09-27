/** Paid visibility: a Find Match boost for a player profile, featured recruitment for a team. */

export const PROMOTIONS = {
  boost: { credits: 20, hours: 24 },
  feature: { credits: 30, hours: 24 },
} as const;

/** Added to the match score for sorting only; the score shown to users stays honest. */
export const BOOST_SORT_BONUS = 15;

const HOUR_MS = 60 * 60 * 1000;

export function isPromoted(until: Date | null | undefined, now = new Date()) {
  return Boolean(until && until > now);
}

/** Buying again while active adds time on top instead of restarting the clock. */
export function extendPromotion(until: Date | null | undefined, hours: number, now = new Date()) {
  const start = until && until > now ? until : now;
  return new Date(start.getTime() + hours * HOUR_MS);
}

/** Promoted items first, otherwise the incoming order is kept. */
export function promotedFirst<T>(items: T[], untilOf: (item: T) => Date | null | undefined, now = new Date()) {
  return [...items.filter((item) => isPromoted(untilOf(item), now)), ...items.filter((item) => !isPromoted(untilOf(item), now))];
}

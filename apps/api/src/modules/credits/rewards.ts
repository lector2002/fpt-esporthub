/** Free credits for coming back: locked, so they are spent like any credits but never leave the app. */
export const CHECK_IN = { daily: 3, every: 5, bonus: 5 } as const;

/** Epic pet given with a user's first paid top-up. */
export const FIRST_TOPUP_PET = "pet_solara";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Check-in days are Vietnam days (UTC+7, no DST). */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** YYYY-MM-DD of the Vietnam day `date` falls on. */
export function vnDay(date = new Date()) {
  return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/** Streak after checking in on `today`: one more if the last check-in was yesterday, otherwise a fresh start. */
export function nextStreak(lastDay: string | null, streak: number, today: string) {
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
  return lastDay === yesterday ? streak + 1 : 1;
}

/** Daily credits, plus the bonus on every `every`-th day in a row (5, 10, 15, ...). */
export function checkInReward(streak: number) {
  return CHECK_IN.daily + (streak % CHECK_IN.every === 0 ? CHECK_IN.bonus : 0);
}

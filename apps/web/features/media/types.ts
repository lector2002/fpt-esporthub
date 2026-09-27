export interface Achievement {
  id: string;
  title: string;
  imageKey: string;
  createdAt: string;
}

/** Who a new achievement belongs to. "coach" is the caller's own coach listing. */
export type AchievementOwnerInput = { owner: "user" } | { owner: "team"; teamId: string } | { owner: "coach" };

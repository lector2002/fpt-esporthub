// API shapes shared across features. Feature-specific shapes live in features/<name>/types.ts.

export type GameSlug = "valorant" | "league_of_legends";
export type GameEnum = "VALORANT" | "LEAGUE_OF_LEGENDS";
export type ReputationBadge = "NEW" | "VERIFIED" | "TRUSTED" | "CAUTION";
export type VerificationStatus = "UNVERIFIED" | "SELF_REPORTED" | "PENDING" | "LINKED" | "VERIFIED" | "API_FAILED" | "SUSPENDED";
/** LoL only: "ranked" and/or "aram". Valorant profiles and teams are always "ranked". */
export type PlayMode = "ranked" | "aram";

export const GAMES: Record<GameSlug, { enum: GameEnum; label: string; short: string }> = {
  valorant: { enum: "VALORANT", label: "Valorant", short: "VAL" },
  league_of_legends: { enum: "LEAGUE_OF_LEGENDS", label: "League of Legends", short: "LoL" },
};

export function gameSlug(game: GameEnum): GameSlug {
  return game === "VALORANT" ? "valorant" : "league_of_legends";
}

export type CosmeticKind = "frame" | "banner" | "nameColor" | "title" | "card" | "pet";

/** Equipped profile cosmetics (catalog ids), null = none. */
export interface CosmeticsView {
  frame: string | null;
  banner: string | null;
  nameColor: string | null;
  title: string | null;
  card: string | null;
  pet: string | null;
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  avatarKey: string | null;
  coverKey: string | null;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "WARNED" | "RESTRICTED" | "BANNED";
  reputationBadge: ReputationBadge;
  /** Questionnaire answers kept on the account: age range is private, campus shows on the profile. */
  ageRange: string | null;
  campus: string | null;
  createdAt: string;
}

export interface PlayerProfile {
  id: string;
  /** Paid Find Match boost end, if any. */
  boostedUntil?: string | null;
  userId: string;
  game: GameEnum;
  rankTier: string;
  rankLevel: number | null;
  role: string;
  schedule: string[];
  goals: string[];
  communicationStyles: string[];
  riotId: string | null;
  verificationStatus: VerificationStatus;
  bio: string | null;
  lookingStatus: string;
  playModes: PlayMode[];
  voiceChat: string | null;
  lossReaction: string | null;
  mains: string[];
  /** Champion in the latest synced LoL match; card art when no mains are set. */
  recentChampion: string | null;
  /** Set once the questionnaire was answered; null = skipped or never shown. */
  questionnaireAt: string | null;
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export function formatRank(profile: Pick<PlayerProfile, "rankTier" | "rankLevel">) {
  return profile.rankLevel ? `${profile.rankTier} ${profile.rankLevel}` : profile.rankTier;
}

/** ARAM-only profiles have no meaningful rank or role (stored as Unranked / Fill). */
export function isAramOnly(playModes: readonly string[] | undefined) {
  return Boolean(playModes && playModes.length > 0 && !playModes.includes("ranked"));
}

/** Mode used by default for matching: ranked when the profile plays it, else ARAM. */
export function primaryPlayMode(playModes: readonly string[] | undefined): PlayMode {
  return isAramOnly(playModes) ? "aram" : "ranked";
}

import type { CosmeticsView, GameSlug, PlayMode, PlayerProfile, ReputationBadge, SessionUser, VerificationStatus } from "@/lib/contracts";

export type LookingStatus = "open_to_match" | "not_looking";

export type ReadinessCheckId = "bio" | "rank" | "schedule" | "goals" | "communication" | "riot" | "questionnaire";

import type { Achievement } from "@/features/media/types";

export interface Readiness {
  percent: number;
  checks: { id: ReadinessCheckId; complete: boolean }[];
}

export interface MyTeam {
  id: string;
  name: string;
  game: GameSlug;
  role: "captain" | "member";
  memberCount: number;
  neededRoles: string[];
  recruitmentOpen: boolean;
}

/** GET /profiles/me?game= */
export interface MyProfileResponse {
  user: SessionUser & { cosmetics: CosmeticsView };
  profiles: PlayerProfile[];
  profile: PlayerProfile | null;
  profileView: { teams: MyTeam[]; readiness: Readiness | null };
  achievements: Achievement[];
}

export interface PublicGameProfile {
  id: string;
  game: GameSlug;
  rankTier: string;
  rankLevel: number | null;
  role: string;
  schedule: string[];
  goals: string[];
  communicationStyles: string[];
  playModes: PlayMode[];
  voiceChat: string | null;
  lossReaction: string | null;
  mains: string[];
  /** Champion in the latest synced LoL match; card art when no mains are set. */
  recentChampion: string | null;
  verificationStatus: VerificationStatus;
  /** Only present once linked to a Riot account. */
  riotId: string | null;
  bio: string | null;
  lookingStatus: string;
}

/** GET /profiles/:userId */
export interface PublicProfileResponse {
  user: { id: string; displayName: string; avatarKey: string | null; coverKey: string | null; cosmetics: CosmeticsView; reputationBadge: ReputationBadge; campus: string | null; createdAt: string };
  profiles: PublicGameProfile[];
  achievements: Achievement[];
}

/** PUT /profiles/me. `game` selects which game profile is updated; displayName is user-level. */
export interface UpdateProfileInput {
  game: GameSlug;
  displayName?: string;
  bio?: string;
  rankTier?: string;
  rankLevel?: number | null;
  role?: string;
  schedule?: string[];
  goals?: string[];
  communicationStyles?: string[];
  lookingStatus?: LookingStatus;
  riotId?: string | null;
  /** LoL only. Switching to ARAM-only stores Unranked / Fill. */
  playModes?: PlayMode[];
}

export interface LookupOption {
  id: string;
  label: string;
}

export interface RankOption {
  tier: string;
  level: number | null;
  label: string;
  sort: number;
}


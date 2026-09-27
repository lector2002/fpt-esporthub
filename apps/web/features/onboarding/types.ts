import type { RiotLookup } from "@/features/riot/types";
import type { QuestionnaireAnswers, toQuestionnaireInput } from "@/features/questionnaire/options";
import type { GameSlug, PlayMode, PlayerProfile } from "@/lib/contracts";

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

export interface PlayModeOption {
  id: PlayMode;
  label: string;
}

export interface OnboardingInput {
  game: GameSlug;
  /** LoL only. ARAM-only sends rank "Unranked" and role "Fill". */
  playModes?: PlayMode[];
  rankTier: string;
  rankLevel?: number;
  /** Role id or label; the API stores the label. */
  role: string;
  schedule: string[];
  goals: string[];
  communicationStyles: string[];
  riotId?: string;
  /** Always sent: replaces the stored answers (empty = skipped). */
  questionnaire: ReturnType<typeof toQuestionnaireInput>;
}

/** Wizard form state. Empty strings / null mean "not chosen yet". */
export interface OnboardingDraft {
  game: GameSlug | null;
  playModes: PlayMode[];
  rankTier: string;
  rankLevel: number | null;
  role: string;
  schedule: string[];
  goals: string[];
  communicationStyles: string[];
  riotId: string;
  /** LoL: account picked from the Riot search in this session; linked right after saving. */
  riotPick: RiotLookup | null;
  answers: QuestionnaireAnswers;
}

export type OnboardingStep = "game" | "mode" | "link" | "rank" | "preferences" | "riot" | "questionnaire" | "review";

export interface OnboardingResponse {
  profile: PlayerProfile;
}

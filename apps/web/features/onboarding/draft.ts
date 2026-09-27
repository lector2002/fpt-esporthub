import { EMPTY_ANSWERS, toQuestionnaireInput } from "@/features/questionnaire/options";
import type { RiotLookup } from "@/features/riot/types";
import { isAramOnly, type GameSlug, type PlayerProfile, type SessionUser } from "@/lib/contracts";
import type { LookupOption, OnboardingDraft, OnboardingInput, OnboardingStep, RankOption } from "./types";

export const MAX_GOALS = 2;
export const MAX_STYLES = 2;

/** Mirrors the API: name 3-16 chars without '#', tag 3-5 letters/digits. */
const RIOT_ID_PATTERN = /^[^#]{3,16}#[A-Za-z0-9]{3,5}$/;

/** Stored for ARAM-only LoL profiles, which skip the rank step. */
const ARAM_RANK = { rankTier: "Unranked", role: "Fill" } as const;

export function emptyDraft(game: GameSlug | null): OnboardingDraft {
  return {
    game,
    playModes: ["ranked"],
    rankTier: "",
    rankLevel: null,
    role: "",
    schedule: [],
    goals: [],
    communicationStyles: [],
    riotId: "",
    riotPick: null,
    answers: EMPTY_ANSWERS,
  };
}

/** Age range and campus belong to the player, so a new game profile starts with them filled in. */
export function answersFromUser(user: Pick<SessionUser, "ageRange" | "campus"> | null) {
  return { ...EMPTY_ANSWERS, ageRange: user?.ageRange ?? null, campus: user?.campus ?? null };
}

export function draftFromProfile(game: GameSlug, profile: PlayerProfile, user: Pick<SessionUser, "ageRange" | "campus"> | null): OnboardingDraft {
  return {
    game,
    playModes: profile.playModes?.length ? profile.playModes : ["ranked"],
    rankTier: profile.rankTier,
    rankLevel: profile.rankLevel,
    role: profile.role,
    schedule: profile.schedule,
    goals: profile.goals.slice(0, MAX_GOALS),
    communicationStyles: profile.communicationStyles.slice(0, MAX_STYLES),
    riotId: profile.riotId ?? "",
    riotPick: null,
    answers: {
      ...answersFromUser(user),
      voiceChat: profile.voiceChat,
      lossReaction: profile.lossReaction,
      mains: profile.mains ?? [],
    },
  };
}

const DIVISIONS: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };

/** Draft rank from the picked account's Solo/Duo entry; no entry leaves the rank as it is. */
export function rankFromLookup(pick: RiotLookup): Partial<OnboardingDraft> {
  const solo = pick.ranked.solo;
  if (!solo) return {};
  return { rankTier: solo.tier, rankLevel: solo.division ? (DIVISIONS[solo.division] ?? null) : null };
}

/** LoL asks for play modes and links Riot before rank (which it fills in); ARAM-only skips rank and role. Valorant types its Riot ID. */
export function stepsFor(draft: OnboardingDraft, withGameStep: boolean): OnboardingStep[] {
  const lol = draft.game === "league_of_legends";
  return (["game", "mode", "link", "rank", "preferences", "riot", "questionnaire", "review"] as const).filter((step) => {
    if (step === "game") return withGameStep;
    if (step === "mode" || step === "link") return lol;
    if (step === "riot") return !lol;
    if (step === "rank") return !(lol && isAramOnly(draft.playModes));
    return true;
  });
}

export function isRiotIdValid(riotId: string) {
  const value = riotId.trim();
  return value === "" || RIOT_ID_PATTERN.test(value);
}

/** Roles are stored as labels ("Duelist") but chosen by id; match either. */
export function findRole(roles: LookupOption[], value: string) {
  const needle = value.toLowerCase();
  return roles.find((role) => role.id === needle || role.label.toLowerCase() === needle);
}

/** Unique tiers in ladder order, each with its divisions (empty for single-division tiers). */
export function groupTiers(ranks: RankOption[]) {
  const tiers = new Map<string, RankOption[]>();
  for (const rank of [...ranks].sort((a, b) => a.sort - b.sort)) {
    tiers.set(rank.tier, [...(tiers.get(rank.tier) ?? []), rank]);
  }
  return [...tiers.entries()].map(([tier, entries]) => ({
    tier,
    divisions: entries.filter((entry) => entry.level !== null),
  }));
}

/** "Gold 2" / "Iron IV" / "Radiant", taken from the lookup label when available. */
export function rankLabel(ranks: RankOption[], tier: string, level: number | null) {
  return ranks.find((rank) => rank.tier === tier && rank.level === level)?.label ?? (level ? `${tier} ${level}` : tier);
}

export function isStepComplete(step: OnboardingStep, draft: OnboardingDraft, ranks: RankOption[]) {
  switch (step) {
    case "game":
      return draft.game !== null;
    case "mode":
      return draft.playModes.length > 0;
    case "rank":
      return Boolean(draft.role) && ranks.some((rank) => rank.tier === draft.rankTier && rank.level === draft.rankLevel);
    case "preferences":
      return draft.schedule.length > 0 && draft.goals.length > 0 && draft.communicationStyles.length > 0;
    case "riot":
      return isRiotIdValid(draft.riotId);
    case "link":
    case "questionnaire":
    case "review":
      return true;
  }
}

export function toInput(draft: OnboardingDraft & { game: GameSlug }): OnboardingInput {
  const riotId = draft.riotId.trim();
  const lol = draft.game === "league_of_legends";
  const rank = lol && isAramOnly(draft.playModes) ? { ...ARAM_RANK, rankLevel: null } : draft;
  return {
    game: draft.game,
    ...(lol ? { playModes: draft.playModes } : {}),
    rankTier: rank.rankTier,
    ...(rank.rankLevel !== null ? { rankLevel: rank.rankLevel } : {}),
    role: rank.role,
    schedule: draft.schedule,
    goals: draft.goals,
    communicationStyles: draft.communicationStyles,
    ...(riotId ? { riotId } : {}),
    questionnaire: toQuestionnaireInput(draft.answers),
  };
}

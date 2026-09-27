// Mirrors apps/api/src/modules/lookups/questionnaire.ts (the API validates these ids).
export const VOICE_CHAT = ["always", "sometimes", "text_only"] as const;
export const LOSS_REACTION = ["calm", "frustrated", "break"] as const;
export const AGE_RANGE = ["under_18", "18_21", "22_25", "over_25"] as const;
export const CAMPUS = ["hanoi", "hcm", "danang", "cantho", "quynhon", "other"] as const;
export const MAX_MAINS = 3;

/** Per game: voice chat, loss reaction, mains. Per player: age range, campus. null = not answered. */
export interface QuestionnaireAnswers {
  voiceChat: string | null;
  lossReaction: string | null;
  mains: string[];
  ageRange: string | null;
  campus: string | null;
}

export const EMPTY_ANSWERS: QuestionnaireAnswers = { voiceChat: null, lossReaction: null, mains: [], ageRange: null, campus: null };

export function hasAnswers(answers: QuestionnaireAnswers) {
  return Boolean(answers.voiceChat || answers.lossReaction || answers.ageRange || answers.campus || answers.mains.length);
}

/** API body: unanswered questions are left out. */
export function toQuestionnaireInput(answers: QuestionnaireAnswers) {
  return {
    ...(answers.voiceChat ? { voiceChat: answers.voiceChat } : {}),
    ...(answers.lossReaction ? { lossReaction: answers.lossReaction } : {}),
    ...(answers.mains.length ? { mains: answers.mains } : {}),
    ...(answers.ageRange ? { ageRange: answers.ageRange } : {}),
    ...(answers.campus ? { campus: answers.campus } : {}),
  };
}

/** Valorant agents; ids are stored, names shown. */
export const VALORANT_AGENTS = [
  "Astra", "Breach", "Brimstone", "Chamber", "Clove", "Cypher", "Deadlock", "Fade", "Gekko", "Harbor", "Iso", "Jett",
  "KAY/O", "Killjoy", "Neon", "Omen", "Phoenix", "Raze", "Reyna", "Sage", "Skye", "Sova", "Tejo", "Viper", "Vyse",
  "Waylay", "Yoru",
].map((name) => ({ id: name.toLowerCase().replace(/[^a-z0-9]/g, ""), label: name }));

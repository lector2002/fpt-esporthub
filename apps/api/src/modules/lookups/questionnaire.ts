// Onboarding questionnaire answer ids. Labels live in the web app; the API only validates ids.
export const VOICE_CHAT_IDS = ["always", "sometimes", "text_only"] as const;
export const LOSS_REACTION_IDS = ["calm", "frustrated", "break"] as const;
export const AGE_RANGE_IDS = ["under_18", "18_21", "22_25", "over_25"] as const;
export const CAMPUS_IDS = ["hanoi", "hcm", "danang", "cantho", "quynhon", "other"] as const;

export const MAX_MAINS = 3;
/** Champion (Data Dragon id, e.g. "MonkeyKing") or agent id; the list itself changes with game patches. */
export const MAIN_ID_PATTERN = /^[A-Za-z0-9_]{2,24}$/;

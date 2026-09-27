import type { GameSlug } from "@/lib/contracts";
import type { Language } from "@/lib/i18n";

/** Quick-add chips for the coach form; players search these terms in English in both languages. */
export const SPECIALTY_SUGGESTIONS: Record<GameSlug, string[]> = {
  league_of_legends: ["Laning", "Macro", "Wave management", "Vision control", "Jungle pathing", "VOD review", "Rank climbing"],
  valorant: ["Aim training", "Crosshair placement", "Utility usage", "Game sense", "Shotcalling", "VOD review", "Rank climbing"],
};

export const AVAILABILITY_SUGGESTIONS: Record<Language, string[]> = {
  vi: ["Tối T2", "Tối T3", "Tối T4", "Tối T5", "Tối T6", "Sáng T7", "Chiều T7", "Chiều Chủ nhật", "Cuối tuần"],
  en: ["Mon evening", "Tue evening", "Wed evening", "Thu evening", "Fri evening", "Sat morning", "Sat afternoon", "Sun afternoon", "Weekend"],
};

/** VND per hour. 0 = free sessions. */
export const RATE_PRESETS = [0, 100_000, 150_000, 200_000, 300_000];

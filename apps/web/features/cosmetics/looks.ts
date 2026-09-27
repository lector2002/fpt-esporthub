/** How each catalog id looks. Ids come from the API (apps/api cosmetics/catalog.ts); unknown ids render as nothing. */
export const FRAME_LOOK: Record<string, string> = {
  frame_gold: "bg-linear-to-br from-amber-200 via-yellow-500 to-amber-700",
  frame_neon: "bg-linear-to-br from-fuchsia-500 via-violet-500 to-cyan-400",
  frame_ember: "bg-linear-to-br from-orange-300 via-red-500 to-rose-700",
  frame_frost: "bg-linear-to-br from-sky-100 via-cyan-400 to-blue-600",
  frame_sakura: "bg-linear-to-br from-pink-100 via-pink-400 to-rose-500",
};

export const BANNER_LOOK: Record<string, string> = {
  banner_sunset: "bg-linear-to-r from-orange-400 via-rose-500 to-purple-600",
  banner_ocean: "bg-linear-to-r from-cyan-500 via-sky-600 to-indigo-700",
  banner_aurora: "bg-linear-to-r from-emerald-400 via-teal-500 to-violet-600",
  banner_ember: "bg-linear-to-r from-amber-500 via-red-600 to-stone-900",
  banner_night: "bg-linear-to-r from-slate-900 via-indigo-900 to-violet-800",
};

export const NAME_COLOR_LOOK: Record<string, string> = {
  name_gold: "text-amber-600 dark:text-amber-400",
  name_cyan: "text-cyan-700 dark:text-cyan-400",
  name_rose: "text-rose-600 dark:text-rose-400",
  name_lime: "text-lime-700 dark:text-lime-400",
};

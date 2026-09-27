/** Default tag of accounts on the Vietnam server; most players never change it. */
const DEFAULT_TAGS = ["VN2"];
export const MAX_RIOT_SUGGESTIONS = 5;
const NAME_MIN = 3;
const NAME_MAX = 16;
const TAG_MIN = 3;
const TAG_MAX = 5;

function split(input: string) {
  const value = input.trim();
  const hash = value.lastIndexOf("#");
  return { name: (hash < 0 ? value : value.slice(0, hash)).trim(), tag: hash < 0 ? "" : value.slice(hash + 1).trim() };
}

/** Name part of a partly typed Riot ID ("Faker#K" -> "Faker"), empty when too short to search. */
export function riotNamePrefix(input: string) {
  const { name } = split(input);
  return name.length >= NAME_MIN && name.length <= NAME_MAX ? name : "";
}

/**
 * Exact Riot IDs worth looking up for a partly typed one (Riot has no name search): the typed tag once it is a
 * full tag, plus default tags that start with what was typed. "Faker" -> ["Faker#VN2"], "Faker#KR1" -> ["Faker#KR1"].
 */
export function riotIdCandidates(input: string): string[] {
  const { tag } = split(input);
  const name = riotNamePrefix(input);
  if (!name || tag.length > TAG_MAX) return [];
  const tags = [...(tag.length >= TAG_MIN ? [tag] : []), ...DEFAULT_TAGS.filter((item) => item.toLowerCase().startsWith(tag.toLowerCase()))];
  const unique = tags.filter((item, index) => tags.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index);
  return unique.map((item) => `${name}#${item}`);
}

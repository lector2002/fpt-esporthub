"use client";

import { useQuery } from "@tanstack/react-query";
import type { Language } from "@/lib/i18n";

const DDRAGON = "https://ddragon.leagueoflegends.com";
const SIX_HOURS = 6 * 60 * 60 * 1000;

export interface Asset {
  name: string;
  image: string;
  /** Plain-text description (items, runes, abilities); HTML tags stripped. */
  description?: string;
}

export interface RuneTree {
  id: number;
  /** Row 0 = keystones, then the three minor rows. */
  slots: number[][];
}

/** Names and icons from Riot's Data Dragon in the viewer's language, keyed by id. */
export interface LolStatic {
  version: string;
  champions: Record<string, Asset & { title: string }>;
  items: Record<number, Asset>;
  spells: Record<number, Asset>;
  /** Rune perks and rune trees share one id space. */
  runes: Record<number, Asset>;
  trees: Record<number, RuneTree>;
}

export interface ChampionAbilities {
  passive: Asset;
  /** Q, W, E, R in order. */
  spells: (Asset & { key: "Q" | "W" | "E" | "R" })[];
}

/** Stat shard rows (offense, flex, defense) since patch 14.1; icons are on the Data Dragon CDN but not in its JSON. */
export const SHARD_ROWS = [
  [5008, 5005, 5007],
  [5008, 5010, 5001],
  [5011, 5013, 5001],
];
const SHARD_ICON: Record<number, string> = {
  5008: "StatModsAdaptiveForceIcon",
  5005: "StatModsAttackSpeedIcon",
  5007: "StatModsCDRScalingIcon",
  5010: "StatModsMovementSpeedIcon",
  5001: "StatModsHealthScalingIcon",
  5011: "StatModsHealthPlusIcon",
  5013: "StatModsTenacityIcon",
};
export const shardIcon = (id: number) => (SHARD_ICON[id] ? `${DDRAGON}/cdn/img/perk-images/StatMods/${SHARD_ICON[id]}.png` : null);

const plain = (html: string) => html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const localeOf = (language: Language) => (language === "vi" ? "vi_VN" : "en_US");

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Data Dragon ${response.status}`);
  return (await response.json()) as T;
}

async function latestVersion() {
  const [version] = await getJson<string[]>(`${DDRAGON}/api/versions.json`);
  return version;
}

type Named = { name: string; image: { full: string } };

async function fetchStatic(language: Language): Promise<LolStatic> {
  const version = await latestVersion();
  const base = `${DDRAGON}/cdn/${version}`;
  const locale = localeOf(language);
  const [champions, items, spells, runes] = await Promise.all([
    getJson<{ data: Record<string, Named & { id: string; title: string }> }>(`${base}/data/${locale}/champion.json`),
    getJson<{ data: Record<string, Named & { plaintext?: string; description: string }> }>(`${base}/data/${locale}/item.json`),
    getJson<{ data: Record<string, Named & { key: string; description: string }> }>(`${base}/data/${locale}/summoner.json`),
    getJson<{ id: number; name: string; icon: string; slots: { runes: { id: number; name: string; icon: string; shortDesc: string }[] }[] }[]>(
      `${base}/data/${locale}/runesReforged.json`,
    ),
  ]);
  const runeAssets: Record<number, Asset> = {};
  const trees: Record<number, RuneTree> = {};
  for (const tree of runes) {
    runeAssets[tree.id] = { name: tree.name, image: `${DDRAGON}/cdn/img/${tree.icon}` };
    trees[tree.id] = { id: tree.id, slots: tree.slots.map((slot) => slot.runes.map((rune) => rune.id)) };
    for (const rune of tree.slots.flatMap((slot) => slot.runes)) {
      runeAssets[rune.id] = { name: rune.name, image: `${DDRAGON}/cdn/img/${rune.icon}`, description: plain(rune.shortDesc) };
    }
  }
  return {
    version,
    champions: Object.fromEntries(Object.values(champions.data).map((c) => [c.id, { name: c.name, title: c.title, image: `${base}/img/champion/${c.image.full}` }])),
    items: Object.fromEntries(
      Object.entries(items.data).map(([id, item]) => [Number(id), { name: item.name, image: `${base}/img/item/${item.image.full}`, description: item.plaintext || plain(item.description) }]),
    ),
    spells: Object.fromEntries(
      Object.values(spells.data).map((spell) => [Number(spell.key), { name: spell.name, image: `${base}/img/spell/${spell.image.full}`, description: plain(spell.description) }]),
    ),
    runes: runeAssets,
    trees,
  };
}

async function fetchAbilities(language: Language, champion: string): Promise<ChampionAbilities> {
  const version = await latestVersion();
  const base = `${DDRAGON}/cdn/${version}`;
  type Detail = { data: Record<string, { passive: Named & { description: string }; spells: (Named & { description: string })[] }> };
  const { data } = await getJson<Detail>(`${base}/data/${localeOf(language)}/champion/${encodeURIComponent(champion)}.json`);
  const detail = data[champion];
  const keys = ["Q", "W", "E", "R"] as const;
  return {
    passive: { name: detail.passive.name, image: `${base}/img/passive/${detail.passive.image.full}`, description: plain(detail.passive.description) },
    spells: detail.spells.slice(0, 4).map((spell, index) => ({
      key: keys[index],
      name: spell.name,
      image: `${base}/img/spell/${spell.image.full}`,
      description: plain(spell.description),
    })),
  };
}

export function useLolStatic(language: Language) {
  return useQuery({ queryKey: ["ddragon", "static", language], queryFn: () => fetchStatic(language), staleTime: SIX_HOURS });
}

export function useChampionAbilities(language: Language, champion: string) {
  return useQuery({ queryKey: ["ddragon", "champion", language, champion], queryFn: () => fetchAbilities(language, champion), staleTime: SIX_HOURS });
}

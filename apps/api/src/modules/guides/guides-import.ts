import type { PrismaClient } from "@fpt-esporthub/database";
import { isGuideData } from "./guide-data";
import { type LolIds, type ParsedGuide, parseOpggBuild } from "./sources/opgg";
import type { PageFetcher } from "./sources/polite-fetch";

export const OPGG_SOURCE = "op.gg";
const OPGG = "https://op.gg";
const DDRAGON = "https://ddragon.leagueoflegends.com";

export interface ImportOptions {
  /** op.gg champion keys to import (e.g. ["ahri"]); all champions when empty. */
  champions?: string[];
  log?: (message: string) => void;
}

export interface ImportResult {
  saved: number;
  failed: string[];
  removed: number;
}

/** 03:00 in Vietnam (UTC+7, no DST) is 20:00 UTC the day before. */
const RUN_AT_UTC_HOUR = 20;

/** Next nightly import time after `now`. */
export function nextRun(now: Date) {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), RUN_AT_UTC_HOUR));
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

const keyOf = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Id lookups from Data Dragon; op.gg keys match either the champion id or its name ("wukong"). */
export async function loadLolIds(): Promise<LolIds> {
  const getJson = async <T>(url: string) => {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Data Dragon ${url} failed (${response.status})`);
    return (await response.json()) as T;
  };
  const [version] = await getJson<string[]>(`${DDRAGON}/api/versions.json`);
  const base = `${DDRAGON}/cdn/${version}/data/en_US`;
  const [champions, spells] = await Promise.all([
    getJson<{ data: Record<string, { id: string; name: string }> }>(`${base}/champion.json`),
    getJson<{ data: Record<string, { key: string; image: { full: string } }> }>(`${base}/summoner.json`),
  ]);
  const list = Object.values(champions.data);
  return {
    championIds: new Set(list.map((champion) => champion.id)),
    championByKey: Object.fromEntries(list.flatMap((champion) => [[keyOf(champion.name), champion.id], [keyOf(champion.id), champion.id]])),
    spellByImage: Object.fromEntries(Object.values(spells.data).map((spell) => [spell.image.full.replace(/\.png$/, ""), Number(spell.key)])),
  };
}

/** Champion keys from op.gg's champion/position sitemap. */
async function championKeys(get: PageFetcher) {
  const xml = (await get(`${OPGG}/sitemap/sitemap-champion-positions.xml`)) ?? "";
  return [...new Set([...xml.matchAll(/\/lol\/champions\/([a-z0-9]+)\/build\//g)].map((match) => match[1]))];
}

async function save(prisma: PrismaClient, guide: ParsedGuide) {
  if (!isGuideData(guide.data)) throw new Error("payload failed validation");
  const { champion, position } = guide;
  const fields = {
    patch: guide.patch,
    sourceUrl: guide.sourceUrl,
    winRate: guide.winRate,
    pickRate: guide.pickRate,
    banRate: guide.banRate,
    data: guide.data as object,
    fetchedAt: new Date(),
  };
  await prisma.buildGuide.upsert({
    where: { champion_position_source: { champion, position, source: OPGG_SOURCE } },
    create: { champion, position, source: OPGG_SOURCE, ...fields },
    update: fields,
  });
}

/**
 * Reads each champion's default op.gg build page, then the other positions op.gg lists for it, and upserts them.
 * A full run that mostly worked also removes op.gg guides it didn't see (champion left a position, or was renamed).
 */
export async function importOpgg(prisma: PrismaClient, get: PageFetcher, { champions = [], log = () => undefined }: ImportOptions = {}): Promise<ImportResult> {
  const startedAt = new Date();
  const ids = await loadLolIds();
  const keys = champions.length ? champions : await championKeys(get);
  const result: ImportResult = { saved: 0, failed: [], removed: 0 };

  for (const [index, key] of keys.entries()) {
    try {
      const main = parseOpggBuild((await get(`${OPGG}/lol/champions/${key}/build`)) ?? "", ids);
      if (!main) throw new Error("no build on the page");
      await save(prisma, main);
      result.saved++;
      for (const position of main.positions.filter((item) => item !== main.position)) {
        const guide = parseOpggBuild((await get(`${OPGG}/lol/champions/${key}/build/${position}`)) ?? "", ids);
        if (guide?.position !== position) continue;
        await save(prisma, guide);
        result.saved++;
      }
      log(`[${index + 1}/${keys.length}] ${main.champion}: ${main.positions.join(", ")}`);
    } catch (error) {
      result.failed.push(key);
      log(`[${index + 1}/${keys.length}] ${key} failed: ${(error as Error).message}`);
    }
  }

  if (!champions.length && keys.length > 0 && result.failed.length / keys.length < 0.1) {
    const { count } = await prisma.buildGuide.deleteMany({ where: { source: OPGG_SOURCE, fetchedAt: { lt: startedAt } } });
    result.removed = count;
  }
  return result;
}

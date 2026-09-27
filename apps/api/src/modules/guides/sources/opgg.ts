import { type HTMLElement, parse } from "node-html-parser";
import { type BuildOption, type GuideData, type Matchup, type Position, POSITIONS, type RunePage, type SkillOrderOption } from "../guide-data";

/** Data Dragon lookups the parser needs to turn op.gg's icon file names into ids. */
export interface LolIds {
  /** "SummonerFlash" -> 4 */
  spellByImage: Record<string, number>;
  /** Data Dragon champion ids, e.g. "TwistedFate". */
  championIds: Set<string>;
  /** op.gg url key ("twistedfate", "wukong") -> Data Dragon id. */
  championByKey: Record<string, string>;
}

export interface ParsedGuide {
  champion: string;
  position: Position;
  patch: string;
  sourceUrl: string;
  winRate: number | null;
  pickRate: number | null;
  banRate: number | null;
  /** Positions op.gg lists for this champion, main first. */
  positions: Position[];
  data: GuideData;
}

const OP_POSITION: Record<string, Position> = { TOP: "top", JUNGLE: "jungle", MID: "mid", ADC: "adc", BOTTOM: "adc", SUPPORT: "support" };
const percent = (text: string | undefined) => (text ? Number.parseFloat(text.replace(/[%,]/g, "")) : Number.NaN);
const count = (text: string | undefined) => (text ? Number.parseInt(text.replace(/\D/g, ""), 10) : Number.NaN);
const round = (value: number) => Math.round(value * 100) / 100;

/** op.gg is a Next.js app: the page data rides along as JSON string chunks in `self.__next_f.push`. */
export function flightText(html: string) {
  let text = "";
  for (const match of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) text += JSON.parse(match[1]) as string;
  return text;
}

/** The balanced JSON array or object that starts at `start`. */
function jsonAt(text: string, start: number) {
  const open = text[start];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (char === "\\") i++;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === open) depth++;
    else if (char === close && --depth === 0) return JSON.parse(text.slice(start, i + 1)) as unknown;
  }
  return null;
}

function tables(root: HTMLElement, caption: string) {
  return root.querySelectorAll("caption").flatMap((node) => (node.text.trim() === caption && node.parentNode ? [node.parentNode] : []));
}

function rows(root: HTMLElement, caption: string) {
  return tables(root, caption).flatMap((table) => table.querySelectorAll("tbody tr"));
}

/** Icon ids in order; a quantity badge next to an icon (two potions) repeats it. */
function iconIds(cell: HTMLElement, ids: LolIds) {
  const result: number[] = [];
  for (const node of cell.querySelectorAll("img, div")) {
    if (node.tagName === "IMG") {
      const src = node.getAttribute("src") ?? "";
      const item = src.match(/\/item\/(\d+)\.png/);
      const spell = src.match(/\/spell\/(\w+)\.png/);
      const id = item ? Number(item[1]) : spell ? ids.spellByImage[spell[1]] : undefined;
      if (id !== undefined) result.push(id);
    } else if (node.childNodes.length === 1 && /^\d+$/.test(node.text.trim()) && result.length > 0) {
      for (let i = 1; i < Number(node.text.trim()); i++) result.push(result[result.length - 1]);
    }
  }
  return result;
}

/** Pick rate + games in the 2nd cell, win rate in the 3rd. */
function rowStats(row: HTMLElement) {
  const cells = row.querySelectorAll("td");
  return { pickRate: percent(cells[1]?.querySelector("strong")?.text), games: count(cells[1]?.querySelector("span")?.text), winRate: percent(cells[2]?.querySelector("strong")?.text) };
}

function buildOptions(root: HTMLElement, caption: string, ids: LolIds): BuildOption[] {
  return rows(root, caption)
    .map((row) => ({ ids: iconIds(row.querySelectorAll("td")[0], ids), ...rowStats(row) }))
    .filter((option) => option.ids.length > 0);
}

/** The 4th-6th item tables only have win rate and games; pick rate is each option's share of the listed games. */
function depthOptions(root: HTMLElement, depth: number, ids: LolIds): BuildOption[] {
  const list = rows(root, `Depth ${depth} Items Table`).map((row) => {
    const cells = row.querySelectorAll("td");
    return { ids: iconIds(cells[0], ids), winRate: percent(cells[1]?.querySelector("strong")?.text), games: count(cells[1]?.querySelector("span")?.text) };
  });
  const total = list.reduce((sum, option) => sum + (option.games || 0), 0);
  return list.filter((option) => option.ids.length > 0).map((option) => ({ ...option, pickRate: total ? round((option.games / total) * 100) : 0 }));
}

function skillOrders(root: HTMLElement): SkillOrderOption[] {
  return rows(root, "SkillOrder Table").map((row) => {
    const cell = row.querySelectorAll("td")[0];
    const order = cell.querySelectorAll("[data-tooltip-id] strong").map((node) => node.text.trim());
    const levels = cell.querySelectorAll("span > strong").map((node) => node.text.trim());
    return { order, ...(levels.length ? { levels } : {}), ...rowStats(row) };
  });
}

interface OpRunePage {
  play: number;
  pick_rate: number;
  builds: {
    primary_perk_style: { id: number };
    perk_sub_style: { id: number };
    main_runes: { id: number; isActive: boolean }[][];
    sub_runes: { id: number; isActive: boolean }[][];
    shards: { id: number; isActive: boolean }[][];
  }[];
}

/** Rune pages come from the page data; their win rates are only in the HTML, next to the same games count. */
function runePages(flight: string, html: string): RunePage[] {
  const at = flight.indexOf('"rune_pages":[');
  if (at < 0) return [];
  const pages = (jsonAt(flight, at + '"rune_pages":'.length) ?? []) as OpRunePage[];
  const winByGames = new Map<number, number>();
  const text = parse(html).text.replace(/\s+/g, " ");
  for (const match of text.matchAll(/([\d.]+)%\s?([\d,]+) GamesPick rate\s?([\d.]+)%\s?Win rate/g)) winByGames.set(count(match[2]), percent(match[3]));
  return pages.flatMap((page) => {
    const build = page.builds[0];
    const winRate = winByGames.get(page.play);
    if (!build || winRate === undefined) return [];
    const active = (slots: { id: number; isActive: boolean }[][]) => slots.flatMap((slot) => slot.filter((rune) => rune.isActive).map((rune) => rune.id));
    return [
      {
        primaryStyle: build.primary_perk_style.id,
        subStyle: build.perk_sub_style.id,
        perks: [...active(build.main_runes), ...active(build.sub_runes)],
        shards: active(build.shards),
        pickRate: round(page.pick_rate * 100),
        winRate,
        games: page.play,
      },
    ];
  });
}

function matchups(section: HTMLElement | undefined, ids: LolIds) {
  const parts = (section?.toString() ?? "").split("Strong against");
  const read = (fragment: string | undefined): Matchup[] =>
    parse(fragment ?? "")
      .querySelectorAll('a[href*="target_champion="]')
      .flatMap((link) => {
        const champion = link.querySelector("img")?.getAttribute("src")?.match(/\/champion\/(\w+)\.png/)?.[1];
        const stats = link.text.replace(/\s+/g, "").match(/([\d.]+)%([\d,]+)Games/);
        if (!champion || !ids.championIds.has(champion) || !stats) return [];
        return [{ champion, winRate: percent(stats[1]), games: count(stats[2]) }];
      });
  return { weakAgainst: read(parts[0]), strongAgainst: read(parts[1]) };
}

function listedPositions(flight: string, own: Position) {
  const match = flight.match(/"positions":(\[\{"name":"[A-Z]+","percentage":"[^"]*"\}(?:,\{"name":"[A-Z]+","percentage":"[^"]*"\})*\])/);
  const listed = match ? (JSON.parse(match[1]) as { name: string }[]).map((item) => OP_POSITION[item.name]).filter(Boolean) : [];
  return [...new Set([own, ...listed])];
}

/** Parses an op.gg champion build page. Returns null when the page has no build (unknown champion, empty position). */
export function parseOpggBuild(html: string, ids: LolIds): ParsedGuide | null {
  const root = parse(html);
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
  const url = canonical.match(/\/lol\/champions\/([a-z0-9]+)\/build(?:\/([a-z]+))?/);
  const champion = url ? ids.championByKey[url[1]] : undefined;
  const flight = flightText(html);
  // The default /build page (main position) has no position in its url.
  const position = (url?.[2] ?? flight.match(/"position":"([a-z]+)","championName"/)?.[1]) as Position | undefined;
  if (!url || !champion || !position || !POSITIONS.includes(position)) return null;

  const text = root.text.replace(/\s+/g, " ");
  const header = text.match(/Win rate\s?([\d.]+)%\s?Pick rate\s?([\d.]+)%\s?Ban rate\s?([\d.]+)%/);
  const patch = text.match(/Patch (\d+\.\d+)/)?.[1];
  // "OP Tier" sits above tier 1; stored as 0.
  const tier = root
    .querySelectorAll("span")
    .map((node) => node.text.trim().match(/^(\d|OP) Tier$/)?.[1])
    .find(Boolean);
  const counterSection = root.querySelectorAll("section").find((node) => node.text.includes("Weak against") && node.text.includes("Strong against"));

  const data: GuideData = {
    ...(tier ? { tier: tier === "OP" ? 0 : Number(tier) } : {}),
    spells: buildOptions(root, "SummonerSpells Table", ids),
    skillOrder: skillOrders(root),
    starterItems: buildOptions(root, "Items Table", ids),
    boots: buildOptions(root, "Boots Table", ids),
    coreBuilds: buildOptions(root, "Builds Table", ids),
    runes: runePages(flight, html),
    fourthItems: depthOptions(root, 4, ids),
    fifthItems: depthOptions(root, 5, ids),
    sixthItems: depthOptions(root, 6, ids),
    ...matchups(counterSection, ids),
  };
  if (!patch || data.spells.length === 0 || data.coreBuilds.length === 0) return null;

  return {
    champion,
    position,
    patch,
    sourceUrl: `https://op.gg/lol/champions/${url[1]}/build/${position}`,
    winRate: header ? percent(header[1]) : null,
    pickRate: header ? percent(header[2]) : null,
    banRate: header ? percent(header[3]) : null,
    positions: listedPositions(flight, position),
    data,
  };
}

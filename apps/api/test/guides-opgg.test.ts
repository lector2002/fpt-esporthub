// Run: npm run test:api (from the repo root). Fixture: op.gg Ahri mid build page, patch 16.19.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fullSkillPath, isGuideData } from "../src/modules/guides/guide-data";
import { nextRun } from "../src/modules/guides/guides-import";
import { type LolIds, parseOpggBuild } from "../src/modules/guides/sources/opgg";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

const html = readFileSync(join(__dirname, "fixtures", "opgg-ahri-mid.html"), "utf8");
const champions = ["Ahri", "Qiyana", "Akshan", "TwistedFate", "Gwen", "AurelionSol", "Sion", "Malphite", "Velkoz", "Garen", "Pantheon"];
const ids: LolIds = {
  spellByImage: { SummonerFlash: 4, SummonerDot: 14, SummonerTeleport: 12, SummonerBarrier: 21, SummonerExhaust: 3, SummonerHaste: 6, SummonerBoost: 1 },
  championIds: new Set(champions),
  championByKey: Object.fromEntries(champions.map((id) => [id.toLowerCase(), id])),
};
const guide = parseOpggBuild(html, ids);

test("reads the champion, position, patch and header rates", () => {
  assert.ok(guide);
  assert.equal(guide.champion, "Ahri");
  assert.equal(guide.position, "mid");
  assert.equal(guide.patch, "16.19");
  assert.equal(guide.sourceUrl, "https://op.gg/lol/champions/ahri/build/mid");
  assert.deepEqual([guide.winRate, guide.pickRate, guide.banRate], [50.55, 9.07, 2.83]);
  assert.equal(guide.data.tier, 1);
  assert.deepEqual(guide.positions, ["mid"]);
});

test("reads spells by Data Dragon key and starter items with their quantity", () => {
  assert.deepEqual(guide?.data.spells[0], { ids: [4, 14], pickRate: 52.61, games: 23202, winRate: 51.42 });
  assert.deepEqual(guide?.data.starterItems[0].ids, [1056, 2003, 2003]);
  assert.deepEqual(guide?.data.boots[0].ids, [3020]);
  assert.deepEqual(guide?.data.coreBuilds[0].ids, [3118, 4645, 3157]);
});

test("reads the max skill order and the per-level path", () => {
  const skills = guide?.data.skillOrder[0];
  assert.deepEqual(skills?.order, ["Q", "W", "E"]);
  assert.equal(skills?.levels?.length, 15);
  assert.deepEqual(skills?.levels?.slice(0, 6), ["W", "Q", "E", "Q", "Q", "R"]);
});

test("the op.gg path is completed to 18 with every ability at its max rank", () => {
  const skills = guide!.data.skillOrder[0];
  const path = fullSkillPath(skills.levels!, skills.order);
  assert.equal(path.length, 18);
  assert.equal(path[15], "R");
  for (const [key, max] of Object.entries({ Q: 5, W: 5, E: 5, R: 3 })) assert.equal(path.filter((skill) => skill === key).length, max, key);
});

test("reads rune pages with keystone first, stat shards and the html win rate", () => {
  const page = guide?.data.runes[0];
  assert.deepEqual(page, {
    primaryStyle: 8100,
    subStyle: 8200,
    perks: [8112, 8139, 8140, 8106, 8226, 8210],
    shards: [5005, 5008, 5001],
    pickRate: 74.4,
    winRate: 50.63,
    games: 33059,
  });
  assert.equal(guide?.data.runes.length, 2);
});

test("gives late items a pick rate from their share of listed games", () => {
  const fourth = guide?.data.fourthItems ?? [];
  assert.deepEqual(fourth[0].ids, [3089]);
  assert.equal(fourth[0].winRate, 59.62);
  const shares = fourth.reduce((sum, option) => sum + option.pickRate, 0);
  assert.ok(Math.abs(shares - 100) < 0.1);
});

test("splits counters into weak and strong matchups", () => {
  assert.deepEqual(guide?.data.weakAgainst?.[0], { champion: "Qiyana", winRate: 46.25, games: 493 });
  assert.equal(guide?.data.weakAgainst?.length, 5);
  assert.deepEqual(guide?.data.strongAgainst?.map((item) => item.champion), ["Sion", "Malphite", "Velkoz", "Garen", "Pantheon"]);
});

test("the parsed guide passes the import validation", () => {
  assert.ok(isGuideData(guide?.data));
});

test("returns null for a champion Data Dragon doesn't know", () => {
  assert.equal(parseOpggBuild(html, { ...ids, championByKey: {} }), null);
});

test("takes the position from the page data on the default build page", () => {
  const jinx = parseOpggBuild(readFileSync(join(__dirname, "fixtures", "opgg-jinx-default.html"), "utf8"), {
    ...ids,
    championIds: new Set([...ids.championIds, "Jinx"]),
    championByKey: { ...ids.championByKey, jinx: "Jinx" },
  });
  assert.equal(jinx?.position, "adc");
  assert.equal(jinx?.sourceUrl, "https://op.gg/lol/champions/jinx/build/adc");
  assert.equal(jinx?.positions[0], "adc");
  assert.equal(jinx?.data.tier, 0, "OP tier is stored as 0");
  assert.ok(jinx && jinx.data.runes.length > 0 && jinx.data.coreBuilds.length > 0);
});

test("the nightly import runs at 3am Vietnam time", () => {
  assert.equal(nextRun(new Date("2026-09-26T10:00:00Z")).toISOString(), "2026-09-26T20:00:00.000Z");
  assert.equal(nextRun(new Date("2026-09-26T20:00:00Z")).toISOString(), "2026-09-27T20:00:00.000Z");
  assert.equal(nextRun(new Date("2026-09-26T21:30:00Z")).toISOString(), "2026-09-27T20:00:00.000Z");
});

console.log(`${passed} passed`);

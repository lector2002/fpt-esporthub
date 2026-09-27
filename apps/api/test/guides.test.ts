// Run: npm run test:api (from the repo root)
import { strict as assert } from "node:assert";
import { type GuideData, freeTier, isGuideData, lockedCounts } from "../src/modules/guides/guide-data";
import { PREMIUM_PASS, extendPremium, hasPremium } from "../src/modules/guides/premium";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

const option = (ids: number[], pickRate: number) => ({ ids, pickRate, winRate: 50, games: 100 });
const matchup = (champion: string, winRate: number) => ({ champion, winRate, games: 400 });
const sample: GuideData = {
  tier: 2,
  spells: [option([4, 14], 70), option([4, 12], 20)],
  skillOrder: [{ order: ["Q", "E", "W"], levels: ["Q", "W", "E", "Q", "Q", "R"], pickRate: 60, winRate: 51, games: 900 }],
  starterItems: [option([1056, 2003], 95)],
  boots: [option([3020], 60), option([3158], 30), option([3111], 5)],
  coreBuilds: [option([3118, 4645, 3157], 13), option([3118, 4645, 3089], 9)],
  runes: [{ primaryStyle: 8100, subStyle: 8200, perks: [8112, 8126], shards: [5008, 5008, 5011], pickRate: 74, winRate: 50.6, games: 33000 }],
  fourthItems: [option([3089], 40), option([3135], 20)],
  weakAgainst: [matchup("Kassadin", 45), matchup("Fizz", 46), matchup("Yasuo", 47), matchup("Zed", 48)],
  strongAgainst: [matchup("Lux", 55)],
};

test("free tier keeps the most picked option per section and the top 3 matchups", () => {
  const free = freeTier(sample);
  assert.deepEqual(free.boots.map((item) => item.ids), [[3020]]);
  assert.equal(free.coreBuilds.length, 1);
  assert.equal(free.fourthItems?.length, 1);
  assert.equal(free.weakAgainst?.length, 3);
  assert.equal(free.tier, 2);
  assert.equal(free.fifthItems, undefined);
});

test("locked counts are what premium adds to each section", () => {
  const locked = lockedCounts(sample);
  assert.equal(locked.boots, sample.boots.length - 1);
  assert.equal(locked.weakAgainst, sample.weakAgainst!.length - 3);
  assert.equal(locked.strongAgainst, 0);
  assert.equal(locked.sixthItems, 0);
});

test("a well-formed guide passes the import check, with or without the optional sections", () => {
  assert.equal(isGuideData(sample), true);
  const { fourthItems: _a, weakAgainst: _b, strongAgainst: _c, tier: _d, ...minimal } = sample;
  assert.equal(isGuideData(minimal), true);
});

test("a guide with a missing section, bad ids, bad skills or a bad matchup is refused", () => {
  const { runes: _runes, ...noRunes } = sample;
  assert.equal(isGuideData(noRunes), false);
  assert.equal(isGuideData({ ...sample, boots: [{ ...sample.boots[0], ids: ["3020"] }] }), false);
  assert.equal(isGuideData({ ...sample, skillOrder: [{ ...sample.skillOrder[0], order: ["Q", "X"] }] }), false);
  assert.equal(isGuideData({ ...sample, skillOrder: [{ ...sample.skillOrder[0], levels: Array(19).fill("Q") }] }), false);
  assert.equal(isGuideData({ ...sample, coreBuilds: [{ ...sample.coreBuilds[0], winRate: Number.NaN }] }), false);
  assert.equal(isGuideData({ ...sample, weakAgainst: [{ champion: "", winRate: 40, games: 10 }] }), false);
  assert.equal(isGuideData(null), false);
});

test("premium runs from now, or from the current end while still active", () => {
  const now = new Date("2026-09-26T00:00:00Z");
  const days = PREMIUM_PASS.days * 86_400_000;
  assert.equal(extendPremium(null, now).getTime(), now.getTime() + days);
  const active = new Date(now.getTime() + 5 * 86_400_000);
  assert.equal(extendPremium(active, now).getTime(), active.getTime() + days);
  const expired = new Date(now.getTime() - 86_400_000);
  assert.equal(extendPremium(expired, now).getTime(), now.getTime() + days);
  assert.equal(hasPremium(expired, now), false);
  assert.equal(hasPremium(active, now), true);
});

console.log(`${passed} passed`);

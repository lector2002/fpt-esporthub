// Run: npm run test:api (from the repo root)
import { strict as assert } from "node:assert";
import { planBracket, seedOrder, type BracketFormat, type PlannedMatch } from "../src/modules/offline-tournaments/bracket";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

const SIZES = Array.from({ length: 39 }, (_, i) => i + 2);

/** Mulberry32: deterministic outcomes so a failure is reproducible. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Plays every match (random winner) by following the links; returns losses per entry and the champion. */
function simulate(matches: PlannedMatch[], entries: number, random: () => number) {
  const slots = new Map(matches.map((m) => [m.key, { A: m.entryA, B: m.entryB }]));
  const losses = new Array<number>(entries).fill(0);
  const played = new Set<string>();
  let champion: number | null = null;
  for (let guard = 0; played.size < matches.length; guard++) {
    assert.ok(guard < matches.length * 4, "bracket never finishes");
    for (const match of matches) {
      const slot = slots.get(match.key)!;
      if (played.has(match.key) || slot.A === null || slot.B === null) continue;
      assert.notEqual(slot.A, slot.B, `${match.key}: an entry meets itself`);
      const [winner, loser] = random() < 0.5 ? [slot.A, slot.B] : [slot.B, slot.A];
      losses[loser] += 1;
      played.add(match.key);
      if (match.winnerTo) slots.get(match.winnerTo.match)![match.winnerTo.slot] = winner;
      else champion = winner;
      if (match.loserTo) slots.get(match.loserTo.match)![match.loserTo.slot] = loser;
    }
  }
  return { losses, champion };
}

test("seed order pairs the top seed with the bottom one and keeps 1 and 2 apart", () => {
  assert.deepEqual(seedOrder(4), [1, 4, 2, 3]);
  assert.deepEqual(seedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
});

test("single elimination has N-1 matches and one final without a next match", () => {
  for (const n of SIZES) {
    const matches = planBracket(n, "SINGLE_ELIMINATION");
    assert.equal(matches.length, n - 1, `n=${n}`);
    assert.equal(matches.filter((m) => m.winnerTo === null).length, 1, `n=${n}`);
    assert.ok(matches.every((m) => m.loserTo === null && m.bracket === "WINNERS"), `n=${n}`);
  }
});

test("double elimination has 2N-2 matches including the grand final", () => {
  for (const n of SIZES.filter((size) => size >= 3)) {
    const matches = planBracket(n, "DOUBLE_ELIMINATION");
    assert.equal(matches.length, 2 * n - 2, `n=${n}`);
    const finals = matches.filter((m) => m.winnerTo === null);
    assert.equal(finals.length, 1, `n=${n}`);
    assert.equal(finals[0].bracket, "GRAND_FINAL", `n=${n}`);
    assert.ok(matches.filter((m) => m.bracket === "WINNERS").every((m) => m.loserTo !== null), `n=${n}: WB match without loser path`);
    assert.ok(matches.filter((m) => m.bracket !== "WINNERS").every((m) => m.loserTo === null), `n=${n}`);
  }
});

test("byes are resolved at generation: every slot holds a seed or is fed by exactly one match", () => {
  for (const format of ["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION"] as BracketFormat[]) {
    for (const n of SIZES.filter((size) => format === "SINGLE_ELIMINATION" || size >= 3)) {
      const matches = planBracket(n, format);
      const feeds = new Map<string, number>();
      for (const m of matches) {
        for (const ref of [m.winnerTo, m.loserTo]) {
          if (ref) feeds.set(`${ref.match}:${ref.slot}`, (feeds.get(`${ref.match}:${ref.slot}`) ?? 0) + 1);
        }
      }
      const seeds: number[] = [];
      for (const m of matches) {
        for (const slot of ["A", "B"] as const) {
          const entry = slot === "A" ? m.entryA : m.entryB;
          const fed = feeds.get(`${m.key}:${slot}`) ?? 0;
          if (entry !== null) seeds.push(entry);
          assert.equal(Number(entry !== null) + fed, 1, `${format} n=${n} ${m.key}:${slot} has ${fed} feeds and entry ${entry}`);
        }
      }
      assert.deepEqual([...seeds].sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i), `${format} n=${n}: every entry placed once`);
    }
  }
});

test("links only point at matches that exist, and never backwards into the same match", () => {
  for (const n of SIZES.filter((size) => size >= 3)) {
    const matches = planBracket(n, "DOUBLE_ELIMINATION");
    const keys = new Set(matches.map((m) => m.key));
    for (const m of matches) {
      for (const ref of [m.winnerTo, m.loserTo]) {
        if (!ref) continue;
        assert.ok(keys.has(ref.match), `n=${n} ${m.key} -> missing ${ref.match}`);
        assert.notEqual(ref.match, m.key);
      }
    }
  }
});

test("simulated single elimination: one champion, everyone else loses exactly once", () => {
  const random = rng(1);
  for (const n of SIZES) {
    for (let run = 0; run < 20; run++) {
      const { losses, champion } = simulate(planBracket(n, "SINGLE_ELIMINATION"), n, random);
      assert.notEqual(champion, null);
      assert.equal(losses[champion!], 0);
      assert.equal(losses.filter((count) => count === 1).length, n - 1, `n=${n}`);
    }
  }
});

test("simulated double elimination: eliminated entries lose twice, the champion at most once", () => {
  const random = rng(2);
  for (const n of SIZES.filter((size) => size >= 3)) {
    for (let run = 0; run < 20; run++) {
      const { losses, champion } = simulate(planBracket(n, "DOUBLE_ELIMINATION"), n, random);
      assert.notEqual(champion, null);
      assert.ok(losses[champion!] <= 1, `n=${n}: champion lost ${losses[champion!]}`);
      const others = losses.filter((_, entry) => entry !== champion);
      // No bracket reset: when the losers-bracket side wins the grand final, the winners-bracket side ends on one loss.
      assert.ok(others.every((count) => count === 2 || count === 1), `n=${n}: ${others.join(",")}`);
      assert.equal(others.filter((count) => count === 1).length, losses[champion!] === 1 ? 1 : 0, `n=${n}`);
    }
  }
});

test("top seeds get the byes", () => {
  const firstRound = planBracket(5, "SINGLE_ELIMINATION").filter((m) => m.bracket === "WINNERS" && m.round === 1);
  // 5 entries in an 8 bracket: only seeds 4 v 5 play in round 1.
  assert.equal(firstRound.length, 1);
  assert.deepEqual([firstRound[0].entryA, firstRound[0].entryB].sort(), [3, 4]);
});

test("rejects brackets that are too small", () => {
  assert.throws(() => planBracket(1, "SINGLE_ELIMINATION"));
  assert.throws(() => planBracket(2, "DOUBLE_ELIMINATION"));
});

console.log(`${passed} passed`);

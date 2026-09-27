// Run: npm run test:api (from the repo root)
import { strict as assert } from "node:assert";
import type { TournamentMatch } from "@fpt-esporthub/database";
import { reportAccess, toMatchView } from "../src/modules/offline-tournaments/tournament-view";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

const match = {
  id: "m1",
  key: "W1-1",
  bracket: "WINNERS",
  round: 1,
  position: 1,
  bestOf: 1,
  entryAId: "entry-a",
  entryBId: "entry-b",
  scoreA: null,
  scoreB: null,
  winnerEntryId: null,
  status: "READY",
  nextMatchKey: "W2-1",
  loserMatchKey: null,
  reports: { A: { scoreA: 1, scoreB: 0 } },
} as unknown as TournamentMatch;
const captainOf = new Map([
  ["entry-a", "captain-a"],
  ["entry-b", "captain-b"],
]);

test("the host sees every captain report", () => {
  assert.deepEqual(toMatchView(match, reportAccess(match, "host", true, captainOf)).reports, { A: { scoreA: 1, scoreB: 0 } });
});

test("the opponent learns a report exists but not its score", () => {
  const view = toMatchView(match, reportAccess(match, "captain-b", false, captainOf));
  assert.deepEqual(view.reports, { B: undefined });
  assert.equal(view.opponentReported, true);
});

test("the reporting captain sees their own report", () => {
  const view = toMatchView(match, reportAccess(match, "captain-a", false, captainOf));
  assert.deepEqual(view.reports, { A: { scoreA: 1, scoreB: 0 } });
  assert.equal(view.opponentReported, false);
});

test("other players and the TV see no reports", () => {
  assert.equal(toMatchView(match, reportAccess(match, "someone", false, captainOf)).reports, undefined);
  assert.equal(toMatchView(match, "none").opponentReported, undefined);
});

console.log(`${passed} passed`);

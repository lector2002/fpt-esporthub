// Run: npm run test:api (from the repo root)
import { strict as assert } from "node:assert";
import { playerRoleFit, roleCompatibility, scheduleOverlap } from "../src/modules/matching/matching.scoring";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

test("a duo partner with a different role fits fully", () => {
  assert.equal(playerRoleFit("Mid", "Jungle"), 1);
});

test("a duo partner with the same role does not fit", () => {
  assert.equal(playerRoleFit("Mid", "mid"), 0);
});

test("Fill stays neutral between players", () => {
  assert.equal(playerRoleFit("Fill", "Mid"), 0.5);
  assert.equal(playerRoleFit("Mid", "Fill"), 0.5);
});

test("a team needing the caller's role still fits fully", () => {
  assert.equal(roleCompatibility("Mid", ["Jungle", "Mid"], true), 1);
});

test("a player free in more slots than the caller is not penalised", () => {
  const caller = ["weekday_evening"];
  const flexible = ["weekday_morning", "weekday_afternoon", "weekday_evening", "late_night", "weekend"];
  assert.equal(scheduleOverlap(caller, flexible), 1);
});

test("schedule overlap is the share of the caller's slots the other side shares", () => {
  assert.equal(scheduleOverlap(["weekday_evening", "weekend"], ["weekend"]), 0.5);
  assert.equal(scheduleOverlap(["weekend"], []), 0);
});

console.log(`${passed} passed`);

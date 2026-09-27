// Run: npm run test:api (from the repo root)
import { strict as assert } from "node:assert";
import { buildReasons, communicationFit, sameCampus, type FitInput, type ScoreParts } from "../src/modules/matching/matching.scoring";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

const player = (patch: Partial<FitInput> = {}): FitInput => ({
  styles: ["chill"],
  voiceChat: null,
  lossReaction: null,
  ageRange: null,
  campus: null,
  ...patch,
});

test("returns the style score alone when neither player answered the questionnaire", () => {
  assert.equal(communicationFit(player(), player()), 1);
  assert.equal(communicationFit(player(), player({ styles: ["try_hard"] })), 0);
});

test("ignores an answer only one player gave", () => {
  assert.equal(communicationFit(player({ voiceChat: "always", ageRange: "18_21" }), player()), 1);
});

test("scores voice chat by distance on the always-sometimes-text scale", () => {
  const always = player({ voiceChat: "always" });
  assert.equal(communicationFit(always, player({ voiceChat: "always" })), 1);
  assert.equal(communicationFit(always, player({ voiceChat: "sometimes" })), 0.75);
  assert.equal(communicationFit(always, player({ voiceChat: "text_only" })), 0.5);
});

test("scores calm players highest on loss reaction", () => {
  const calm = player({ lossReaction: "calm" });
  assert.equal(communicationFit(calm, player({ lossReaction: "calm" })), 1);
  assert.equal(communicationFit(calm, player({ lossReaction: "break" })), 0.875);
  assert.equal(communicationFit(player({ lossReaction: "frustrated" }), player({ lossReaction: "break" })), 0.75);
});

test("scores adjacent age ranges half and distant ones zero", () => {
  const young = player({ ageRange: "under_18" });
  assert.equal(communicationFit(young, player({ ageRange: "18_21" })), 0.75);
  assert.equal(communicationFit(young, player({ ageRange: "over_25" })), 0.5);
});

test("a shared campus only adds, a different campus never lowers the score", () => {
  const hanoi = player({ styles: ["try_hard"], campus: "hanoi" });
  assert.equal(communicationFit(hanoi, player({ campus: "hanoi" })), 0.5);
  assert.equal(communicationFit(hanoi, player({ campus: "hcm" })), 0);
});

test("treats 'other' campus as no campus", () => {
  assert.equal(sameCampus("other", "other"), false);
  assert.equal(sameCampus("hanoi", "hanoi"), true);
  assert.equal(sameCampus(null, "hanoi"), false);
});

test("puts extra reasons first and keeps at most three", () => {
  const scores: ScoreParts = { rank: 1, role: 1, schedule: 1, goals: 1, communication: 1, reputation: 1 };
  assert.deepEqual(buildReasons(scores, undefined, ["same_campus"]), ["same_campus", "similar_rank", "role_fit"]);
  assert.deepEqual(buildReasons(scores), ["similar_rank", "role_fit", "schedule_overlap"]);
});

console.log(`${passed} passed`);

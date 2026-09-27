// Run: npm run test:api (from the repo root)
import { strict as assert } from "node:assert";
import { riotIdCandidates, riotNamePrefix } from "../src/modules/riot/riot-suggest";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

test("a name without a tag is tried with the Vietnam default tag", () => {
  assert.deepEqual(riotIdCandidates("Stub Player"), ["Stub Player#VN2"]);
});

test("a full typed tag is tried first, then defaults it could still become", () => {
  assert.deepEqual(riotIdCandidates("Faker#KR1"), ["Faker#KR1"]);
  assert.deepEqual(riotIdCandidates("Faker#VN2"), ["Faker#VN2"]);
  assert.deepEqual(riotIdCandidates("faker#vn2"), ["faker#vn2"]);
});

test("a partly typed tag completes to the matching default tag", () => {
  assert.deepEqual(riotIdCandidates("Faker#v"), ["Faker#VN2"]);
  assert.deepEqual(riotIdCandidates("Faker#"), ["Faker#VN2"]);
  assert.deepEqual(riotIdCandidates("Faker#k"), []);
});

test("returns nothing for names Riot would reject", () => {
  assert.deepEqual(riotIdCandidates("ab"), []);
  assert.deepEqual(riotIdCandidates("a".repeat(17)), []);
  assert.deepEqual(riotIdCandidates("Faker#TOOLONG"), []);
  assert.deepEqual(riotIdCandidates("   "), []);
});

test("name prefix drops the tag and short names", () => {
  assert.equal(riotNamePrefix(" Stub Player#VN "), "Stub Player");
  assert.equal(riotNamePrefix("ab#VN2"), "");
});

console.log(`${passed} passed`);

// Run: npm run test:api (from the repo root)
import "reflect-metadata";
import { strict as assert } from "node:assert";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { CreateTournamentDto, UpdateTournamentDto } from "../src/modules/tournaments/dto/tournament.dto";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

const base = { title: "LOL University Cup", game: "league_of_legends", organizer: "VUG", startsAt: "2026-12-05T12:00:00Z", deadlineAt: "2026-11-28T12:00:00Z" };
const errorsFor = (body: object) => validateSync(plainToInstance(CreateTournamentDto, { ...base, ...body })).map((error) => error.property);

test("accepts an event with registration details", () => {
  assert.deepEqual(errorsFor({ registrationUrl: "https://forms.gle/abc", format: "5v5, BO1", prize: "10.000.000đ", teamSize: 5 }), []);
});

test("rejects registration links that are not http(s)", () => {
  assert.deepEqual(errorsFor({ registrationUrl: "javascript:alert(1)" }), ["registrationUrl"]);
  assert.deepEqual(errorsFor({ registrationUrl: "forms.gle/abc" }), ["registrationUrl"]);
});

test("rejects team sizes outside 1 to 10", () => {
  assert.deepEqual(errorsFor({ teamSize: 0 }), ["teamSize"]);
  assert.deepEqual(errorsFor({ teamSize: 11 }), ["teamSize"]);
});

test("an update can clear the link and the team size", () => {
  assert.deepEqual(validateSync(plainToInstance(UpdateTournamentDto, { registrationUrl: "", teamSize: null })), []);
});

console.log(`${passed} passed`);

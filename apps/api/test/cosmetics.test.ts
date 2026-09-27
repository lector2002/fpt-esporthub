// Run: npm run test:api (from the repo root)
import { strict as assert } from "node:assert";
import { COSMETICS, COSMETIC_KINDS, EQUIPPED_FIELD, findCosmetic, toCosmeticsView } from "../src/modules/cosmetics/catalog";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

test("every catalog id is unique and priced", () => {
  assert.equal(new Set(COSMETICS.map((item) => item.id)).size, COSMETICS.length);
  assert.ok(COSMETICS.every((item) => Number.isInteger(item.credits) && item.credits > 0));
});

test("every kind has items and a user column", () => {
  for (const kind of COSMETIC_KINDS) {
    assert.ok(COSMETICS.some((item) => item.kind === kind), kind);
    assert.ok(EQUIPPED_FIELD[kind], kind);
  }
});

test("lookup finds catalog items and nothing else", () => {
  const first = COSMETICS[0];
  assert.deepEqual(findCosmetic(first.id), first);
  assert.equal(findCosmetic("frame_does_not_exist"), null);
});

test("an equipped id that left the catalog shows as nothing", () => {
  const frame = COSMETICS.find((item) => item.kind === "frame")!.id;
  assert.deepEqual(toCosmeticsView({ frameId: frame, bannerId: "banner_retired", nameColorId: null, titleId: null }), {
    frame,
    banner: null,
    nameColor: null,
    title: null,
  });
});

console.log(`${passed} passed`);

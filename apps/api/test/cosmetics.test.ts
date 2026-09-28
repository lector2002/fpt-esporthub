// Run: npm run test:api (from the repo root)
import { strict as assert } from "node:assert";
import { COSMETICS, COSMETIC_KINDS, EQUIPPED_FIELD, findCosmetic, toCosmeticsView, type CosmeticItem } from "../src/modules/cosmetics/catalog";
import { RARITY_WEIGHT, gachaRates, pickFromPool } from "../src/modules/cosmetics/gacha";

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

test("within a kind, a higher rarity never costs less", () => {
  const rank = { common: 0, rare: 1, epic: 2 };
  for (const kind of COSMETIC_KINDS) {
    const items = COSMETICS.filter((item) => item.kind === kind).sort((a, b) => rank[a.rarity] - rank[b.rarity]);
    items.slice(1).forEach((item, i) => assert.ok(item.credits >= items[i].credits, item.id));
    assert.ok(items.some((item) => item.rarity === "common"), kind);
  }
});

test("lookup finds catalog items and nothing else", () => {
  const first = COSMETICS[0];
  assert.deepEqual(findCosmetic(first.id), first);
  assert.equal(findCosmetic("frame_does_not_exist"), null);
});

test("an equipped id that left the catalog shows as nothing", () => {
  const frame = COSMETICS.find((item) => item.kind === "frame")!.id;
  assert.deepEqual(toCosmeticsView({ frameId: frame, bannerId: "banner_retired", nameColorId: null, titleId: null, cardId: null, petId: null }), {
    frame,
    banner: null,
    nameColor: null,
    title: null,
    card: null,
    pet: null,
  });
});

const common = COSMETICS.filter((item) => item.rarity === "common").slice(0, 3);
const rare: CosmeticItem = { id: "test_rare", kind: "frame", credits: 30, rarity: "rare" };
const epic: CosmeticItem = { id: "test_epic", kind: "frame", credits: 30, rarity: "epic" };

test("gacha rates split only between rarities left in the pool", () => {
  assert.deepEqual(gachaRates([...common, rare, epic]), { common: RARITY_WEIGHT.common, rare: RARITY_WEIGHT.rare, epic: RARITY_WEIGHT.epic });
  assert.deepEqual(gachaRates(common), { common: 100, rare: 0, epic: 0 });
  assert.deepEqual(gachaRates([]), { common: 0, rare: 0, epic: 0 });
});

test("gacha picks by rarity weight, then evenly within the rarity", () => {
  const pool = [...common, rare, epic];
  const total = RARITY_WEIGHT.common + RARITY_WEIGHT.rare + RARITY_WEIGHT.epic;
  const rolls = (first: number, second = 0) => {
    const queue = [first, second];
    return (max: number) => Math.min(queue.shift()!, max - 1);
  };
  assert.equal(pickFromPool(pool, rolls(0, 2))?.id, common[2].id);
  assert.equal(pickFromPool(pool, rolls(RARITY_WEIGHT.common))?.id, rare.id);
  assert.equal(pickFromPool(pool, rolls(total - 1))?.id, epic.id);
});

test("gacha has nothing to give once the pool is empty", () => {
  assert.equal(pickFromPool([], () => 0), null);
});

console.log(`${passed} passed`);

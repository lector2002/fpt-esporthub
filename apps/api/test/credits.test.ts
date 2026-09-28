// Run: npm run test:api (from the repo root)
import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import { InsufficientCreditsError, applyCredit } from "../src/modules/credits/credit-ledger";
import { CHECK_IN, checkInReward, nextStreak } from "../src/modules/credits/rewards";
import { CREDIT_VND, TOPUP_MAX, TOPUP_MIN, TOPUP_PACKAGES, creditsForVnd, topUpPackage } from "../src/modules/credits/credit-pricing";
import { createPaymentProvider } from "../src/modules/credits/payment-provider";
import { isValidWebhookSignature, signPaymentRequest, signWebhookData } from "../src/modules/credits/payos-signature";

let passed = 0;
async function test(name: string, fn: () => Promise<void> | void) {
  await fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

const KEY = "test-checksum-key";
const hmac = (data: string) => createHmac("sha256", KEY).update(data).digest("hex");

/** Just enough of a Prisma transaction client for the ledger: one user row and a transactions table. */
function fakeTx(balance: number, locked = 0) {
  const user = { id: "u1", creditBalance: balance, lockedCredits: locked };
  const rows: { ref: string; amount: number; balanceAfter: number }[] = [];
  const tx = {
    creditTransaction: {
      findUnique: async ({ where }: { where: { ref: string } }) => rows.find((row) => row.ref === where.ref) ?? null,
      create: async ({ data }: { data: { ref: string; amount: number; balanceAfter: number } }) => {
        if (rows.some((row) => row.ref === data.ref)) throw Object.assign(new Error("dup"), { code: "P2002" });
        rows.push(data);
      },
    },
    // Same as the ledger's UPDATE, reading its values in order.
    $executeRaw: async (_sql: TemplateStringsArray, amount: number, lockedChange: number, _id: string, paidOnly: boolean, need: number) => {
      if (user.creditBalance - (paidOnly ? user.lockedCredits : 0) < need) return 0;
      user.creditBalance += amount;
      user.lockedCredits = Math.max(user.lockedCredits + lockedChange, 0);
      return 1;
    },
    user: {
      findUniqueOrThrow: async () => ({ creditBalance: user.creditBalance, lockedCredits: user.lockedCredits }),
    },
  };
  return { tx: tx as unknown as Parameters<typeof applyCredit>[0], user, rows };
}

async function main() {
  await test("payment links are signed over the five payOS fields in alphabetical order", () => {
    const fields = { orderCode: 100001, amount: 50000, description: "EsportHub 50 credits", returnUrl: "https://x/wallet", cancelUrl: "https://x/cancel" };
    assert.equal(
      signPaymentRequest(KEY, fields),
      hmac("amount=50000&cancelUrl=https://x/cancel&description=EsportHub 50 credits&orderCode=100001&returnUrl=https://x/wallet"),
    );
  });

  await test("webhook data is signed over sorted keys with nulls as empty strings", () => {
    const data = { orderCode: 7, amount: 20000, desc: "success", code: "00", reference: null };
    assert.equal(signWebhookData(KEY, data), hmac("amount=20000&code=00&desc=success&orderCode=7&reference="));
  });

  await test("a webhook with a wrong or missing signature is rejected", () => {
    const data = { orderCode: 7, amount: 20000, code: "00" };
    assert.ok(isValidWebhookSignature(KEY, data, signWebhookData(KEY, data)));
    assert.equal(isValidWebhookSignature(KEY, { ...data, amount: 2_000_000 }, signWebhookData(KEY, data)), false);
    assert.equal(isValidWebhookSignature("other-key", data, signWebhookData(KEY, data)), false);
    assert.equal(isValidWebhookSignature(KEY, data, undefined), false);
    assert.equal(isValidWebhookSignature(KEY, data, "zz"), false);
  });

  await test("payOS webhooks credit only when signed, successful and well formed", () => {
    const provider = createPaymentProvider({ PAYOS_CLIENT_ID: "c", PAYOS_API_KEY: "a", PAYOS_CHECKSUM_KEY: KEY } as NodeJS.ProcessEnv)!;
    const data = { orderCode: 9, amount: 50000, code: "00", desc: "success" };
    assert.deepEqual(provider.readWebhook({ code: "00", data, signature: signWebhookData(KEY, data) }), { orderCode: 9, amountVnd: 50000 });
    const failed = { ...data, code: "01" };
    assert.equal(provider.readWebhook({ code: "00", data: failed, signature: signWebhookData(KEY, failed) }), null);
    assert.equal(provider.readWebhook({ code: "00", data, signature: "0".repeat(64) }), null);
    assert.equal(provider.readWebhook("not json"), null);
  });

  await test("any whole number of credits within the limits can be bought and prices come from the server", () => {
    for (const credits of [...TOPUP_PACKAGES, TOPUP_MIN, 37, TOPUP_MAX]) assert.deepEqual(topUpPackage(credits), { credits, amountVnd: credits * CREDIT_VND });
    for (const credits of [0, -20, TOPUP_MIN - 1, TOPUP_MAX + 1, 20.5, Number.NaN]) assert.equal(topUpPackage(credits), null);
  });

  await test("coaching prices round up to whole credits", () => {
    assert.equal(creditsForVnd(100_000), 100);
    assert.equal(creditsForVnd(100_001), 101);
  });

  await test("payOS is used only with all three keys, the mock only outside production", () => {
    assert.equal(createPaymentProvider({ PAYOS_CLIENT_ID: "c", PAYOS_API_KEY: "a", PAYOS_CHECKSUM_KEY: "k" } as NodeJS.ProcessEnv)?.name, "payos");
    assert.throws(() => createPaymentProvider({ PAYOS_CLIENT_ID: "c" } as NodeJS.ProcessEnv));
    assert.equal(createPaymentProvider({ NODE_ENV: "production" } as NodeJS.ProcessEnv), null);
    assert.equal(createPaymentProvider({ NODE_ENV: "development" } as NodeJS.ProcessEnv)?.name, "mock");
    const withKeys = { PAYOS_CLIENT_ID: "c", PAYOS_API_KEY: "a", PAYOS_CHECKSUM_KEY: "k", PAYMENT_PROVIDER: "mock" };
    assert.equal(createPaymentProvider({ ...withKeys, NODE_ENV: "development" } as NodeJS.ProcessEnv)?.name, "mock");
    assert.equal(createPaymentProvider({ ...withKeys, NODE_ENV: "production" } as NodeJS.ProcessEnv)?.name, "payos");
  });

  await test("spending more than the balance fails and changes nothing", async () => {
    const { tx, user, rows } = fakeTx(10);
    await assert.rejects(applyCredit(tx, { userId: "u1", amount: -11, kind: "BOOST", ref: "boost:1" }), InsufficientCreditsError);
    assert.equal(user.creditBalance, 10);
    assert.equal(rows.length, 0);
  });

  await test("the same ref moves credits once, so a replayed webhook credits once", async () => {
    const { tx, user, rows } = fakeTx(0);
    assert.deepEqual(await applyCredit(tx, { userId: "u1", amount: 50, kind: "TOPUP", ref: "topup:9" }), { applied: true, balance: 50 });
    assert.deepEqual(await applyCredit(tx, { userId: "u1", amount: 50, kind: "TOPUP", ref: "topup:9" }), { applied: false, balance: 50 });
    assert.equal(user.creditBalance, 50);
    assert.equal(rows.length, 1);
  });

  await test("a spend then its refund returns the balance and records both", async () => {
    const { tx, user, rows } = fakeTx(100);
    await applyCredit(tx, { userId: "u1", amount: -60, kind: "COACHING_HOLD", ref: "hold:r1" });
    await applyCredit(tx, { userId: "u1", amount: 60, kind: "COACHING_REFUND", ref: "refund:r1" });
    assert.equal(user.creditBalance, 100);
    assert.deepEqual(rows.map((row) => row.balanceAfter), [40, 100]);
  });

  await test("zero and fractional amounts are refused", async () => {
    const { tx } = fakeTx(100);
    await assert.rejects(applyCredit(tx, { userId: "u1", amount: 0, kind: "ADJUSTMENT", ref: "a" }));
    await assert.rejects(applyCredit(tx, { userId: "u1", amount: 1.5, kind: "ADJUSTMENT", ref: "b" }));
  });

  await test("reward credits come in locked and a spend uses them before paid credits", async () => {
    const { tx, user } = fakeTx(10);
    await applyCredit(tx, { userId: "u1", amount: 3, kind: "REWARD", ref: "checkin:1", locked: true });
    assert.deepEqual([user.creditBalance, user.lockedCredits], [13, 3]);
    await applyCredit(tx, { userId: "u1", amount: -2, kind: "BOOST", ref: "boost:1" });
    assert.deepEqual([user.creditBalance, user.lockedCredits], [11, 1]);
    await applyCredit(tx, { userId: "u1", amount: -5, kind: "BOOST", ref: "boost:2" });
    assert.deepEqual([user.creditBalance, user.lockedCredits], [6, 0]);
  });

  await test("a coaching hold can't use reward credits", async () => {
    const { tx, user } = fakeTx(10, 8);
    await assert.rejects(applyCredit(tx, { userId: "u1", amount: -3, kind: "COACHING_HOLD", ref: "hold:1", paidOnly: true }), InsufficientCreditsError);
    await applyCredit(tx, { userId: "u1", amount: -2, kind: "COACHING_HOLD", ref: "hold:2", paidOnly: true });
    assert.deepEqual([user.creditBalance, user.lockedCredits], [8, 8]);
  });

  await test("the check-in streak grows on consecutive Vietnam days and restarts after a missed day", () => {
    assert.equal(nextStreak(null, 0, "2026-09-28"), 1);
    assert.equal(nextStreak("2026-09-27", 4, "2026-09-28"), 5);
    assert.equal(nextStreak("2026-09-30", 2, "2026-10-01"), 3);
    assert.equal(nextStreak("2026-09-26", 4, "2026-09-28"), 1);
  });

  await test("every check-in gives the daily credits and every full streak cycle adds the bonus", () => {
    const rewards = Array.from({ length: CHECK_IN.every * 2 }, (_, index) => checkInReward(index + 1));
    const bonusDays = rewards.flatMap((reward, index) => (reward > CHECK_IN.daily ? [index + 1] : []));
    assert.deepEqual(bonusDays, [CHECK_IN.every, CHECK_IN.every * 2]);
    assert.equal(checkInReward(CHECK_IN.every), CHECK_IN.daily + CHECK_IN.bonus);
    assert.equal(checkInReward(1), CHECK_IN.daily);
  });

  console.log(`${passed} passed`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});

// Run: npm run test:api (from the repo root)
import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import { STUN_URL, buildIceServers, resolveIceServers, turnCredential } from "../src/modules/realtime/ice-servers";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

test("HMAC-SHA1 matches RFC 2202 test case 2", () => {
  const hex = createHmac("sha1", "Jefe").update("what do ya want for nothing?").digest("hex");
  assert.equal(hex, "effcdf6ae5eb2fa2d27416d5f184df9c259a7c79");
});

test("turn credential matches an openssl-computed vector", () => {
  // printf '1700003600:user_1' | openssl dgst -sha1 -hmac s3cret -binary | base64
  const { username, credential } = turnCredential("s3cret", "user_1", 1_700_000_000, 3600);
  assert.equal(username, "1700003600:user_1");
  assert.equal(credential, "Esz+Jl6C4GCv5IIvzZBTvDPopk4=");
});

test("returns only STUN when TURN env is missing", () => {
  const { iceServers } = buildIceServers({}, "u1", 0);
  assert.deepEqual(iceServers, [{ urls: [STUN_URL] }]);
});

test("returns only STUN when TURN_SECRET is empty", () => {
  const { iceServers } = buildIceServers({ TURN_URLS: "turn:a:3478", TURN_SECRET: "" }, "u1", 0);
  assert.equal(iceServers.length, 1);
});

test("adds TURN with split urls and a one hour expiry when configured", () => {
  const now = 1_700_000_000_500;
  const { iceServers, ttlSeconds } = buildIceServers(
    { TURN_URLS: "turn:turn.example.com:3478?transport=udp, turns:turn.example.com:443?transport=tcp", TURN_SECRET: "s3cret" },
    "user_1",
    now,
  );
  assert.equal(ttlSeconds, 3600);
  const turn = iceServers[1];
  assert.deepEqual(turn.urls, ["turn:turn.example.com:3478?transport=udp", "turns:turn.example.com:443?transport=tcp"]);
  assert.equal(turn.username, "1700003600:user_1");
  assert.equal(turn.credential, "Esz+Jl6C4GCv5IIvzZBTvDPopk4=");
});

const CLOUDFLARE = { CLOUDFLARE_TURN_KEY_ID: "key_1", CLOUDFLARE_TURN_API_TOKEN: "tok_1", TURN_URLS: "turn:self:3478", TURN_SECRET: "s3cret" };
const cloudflareServers = [
  { urls: ["stun:stun.cloudflare.com:3478"] },
  { urls: ["turn:turn.cloudflare.com:3478?transport=udp", "turns:turn.cloudflare.com:443?transport=tcp"], username: "cf-user", credential: "cf-pass" },
];
const reply = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;

async function run() {
  await asyncTest("uses Cloudflare TURN credentials when its key is set", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetcher = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ iceServers: cloudflareServers }), { status: 201 });
    }) as typeof fetch;
    const { iceServers, ttlSeconds } = await resolveIceServers(CLOUDFLARE, "u1", 0, fetcher);
    assert.deepEqual(iceServers, cloudflareServers);
    assert.equal(ttlSeconds, 3600);
    assert.equal(calls[0].url, "https://rtc.live.cloudflare.com/v1/turn/keys/key_1/credentials/generate-ice-servers");
    assert.equal(calls[0].init?.method, "POST");
    assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, "Bearer tok_1");
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { ttl: 3600 });
  });

  await asyncTest("falls back to self-hosted TURN and reports why when Cloudflare fails", async () => {
    const errors: string[] = [];
    const { iceServers } = await resolveIceServers(CLOUDFLARE, "u1", 0, reply(401, { error: "bad token" }), (message) => errors.push(message));
    assert.deepEqual(iceServers[1].urls, ["turn:self:3478"]);
    assert.match(errors[0], /401/);
  });

  await asyncTest("rejects a Cloudflare reply without usable servers", async () => {
    const errors: string[] = [];
    const { iceServers } = await resolveIceServers({ ...CLOUDFLARE, TURN_URLS: "" }, "u1", 0, reply(201, { iceServers: [{ urls: "nope" }] }), (message) => errors.push(message));
    assert.deepEqual(iceServers, [{ urls: [STUN_URL] }]);
    assert.equal(errors.length, 1);
  });

  await asyncTest("skips Cloudflare when only half of its settings are present", async () => {
    let called = false;
    const fetcher = (async () => {
      called = true;
      return new Response("{}");
    }) as typeof fetch;
    await resolveIceServers({ CLOUDFLARE_TURN_KEY_ID: "key_1" }, "u1", 0, fetcher);
    assert.equal(called, false);
  });

  console.log(`${passed} passed`);
}

async function asyncTest(name: string, fn: () => Promise<void>) {
  await fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

void run();

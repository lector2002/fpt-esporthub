// Run: npm run test:api (from the repo root)
import { strict as assert } from "node:assert";
import { CallRegistry, MAX_CALL_SIZE, presentCall } from "../src/modules/realtime/call-state";
import { readMute, readSignal } from "../src/modules/realtime/call-payloads";
import { CallRateLimiter } from "../src/modules/realtime/call-rate-limit";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

const names = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, `Name ${id}`]));

function startCall(registry: CallRegistry, memberIds: string[], caller = memberIds[0], id = "call-1", conversationId = "conv-1") {
  return registry.start({ id, conversationId, userId: caller, socketId: `s-${caller}`, memberIds, names: names(memberIds), now: 1000 });
}

function expectFailure(result: ReturnType<CallRegistry["join"]>, reason: string) {
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, reason);
}

test("start rings every other member and keeps the caller as the only participant", () => {
  const registry = new CallRegistry();
  const result = startCall(registry, ["a", "b", "c"]);
  assert.ok(result.ok);
  const view = presentCall(result.call);
  assert.deepEqual(view.participants.map((p) => p.userId), ["a"]);
  assert.deepEqual(view.ringing.map((p) => p.userId), ["b", "c"]);
  assert.equal(view.connectedAt, null);
});

test("start rejects a caller who is not a member", () => {
  expectFailure(startCall(new CallRegistry(), ["a", "b"], "x"), "not_member");
});

test("only one active call per conversation", () => {
  const registry = new CallRegistry();
  startCall(registry, ["a", "b", "c"]);
  const second = startCall(registry, ["a", "b", "c"], "c", "call-2");
  expectFailure(second, "call_active");
  if (!second.ok) assert.equal(second.callId, "call-1");
});

test("a user can be in only one call at a time", () => {
  const registry = new CallRegistry();
  startCall(registry, ["a", "b"]);
  expectFailure(startCall(registry, ["a", "c"], "a", "call-2", "conv-2"), "busy");
  startCall(registry, ["c", "d", "a"], "c", "call-3", "conv-3");
  expectFailure(registry.join("call-3", "a", "s-a", 2000), "busy");
});

test("start fails when every other member is already in a call", () => {
  const registry = new CallRegistry();
  startCall(registry, ["b", "c"], "b");
  expectFailure(startCall(registry, ["a", "b"], "a", "call-2", "conv-2"), "unavailable");
});

test("join connects the call, stops ringing that user and rejects non-members", () => {
  const registry = new CallRegistry();
  startCall(registry, ["a", "b", "c"]);
  const joined = registry.join("call-1", "b", "s-b", 2000);
  assert.ok(joined.ok);
  assert.equal(joined.call.connectedAt, 2000);
  assert.deepEqual([...joined.call.ringing], ["c"]);
  expectFailure(registry.join("call-1", "x", "s-x", 2000), "not_member");
  expectFailure(registry.join("missing", "c", "s-c", 2000), "no_call");
});

test(`caps a call at ${MAX_CALL_SIZE} participants`, () => {
  const registry = new CallRegistry();
  const ids = ["a", "b", "c", "d", "e", "f"];
  startCall(registry, ids);
  for (const id of ids.slice(1, MAX_CALL_SIZE)) assert.ok(registry.join("call-1", id, `s-${id}`, 2000).ok);
  expectFailure(registry.join("call-1", "f", "s-f", 2000), "full");
});

test("decline by the last ringing member of an unanswered call ends it as declined", () => {
  const registry = new CallRegistry();
  startCall(registry, ["a", "b"]);
  const result = registry.decline("call-1", "b");
  assert.ok(result.ok);
  assert.equal(result.ended, "declined");
  assert.equal(registry.get("call-1"), null);
  assert.ok(startCall(registry, ["a", "b"], "a", "call-2").ok, "caller is free again");
});

test("decline while others still ring keeps the call", () => {
  const registry = new CallRegistry();
  startCall(registry, ["a", "b", "c"]);
  const result = registry.decline("call-1", "b");
  assert.ok(result.ok);
  assert.equal(result.ended, undefined);
});

test("a connected call ends when fewer than 2 remain", () => {
  const registry = new CallRegistry();
  startCall(registry, ["a", "b", "c"]);
  registry.join("call-1", "b", "s-b", 2000);
  registry.join("call-1", "c", "s-c", 2000);
  const first = registry.leave("call-1", "c");
  assert.ok(first.ok && !first.ended);
  const second = registry.leave("call-1", "b");
  assert.ok(second.ok);
  assert.equal(second.ended, "ended");
  assert.equal(registry.get("call-1"), null);
});

test("the caller hanging up while ringing ends the call", () => {
  const registry = new CallRegistry();
  startCall(registry, ["a", "b"]);
  const result = registry.leave("call-1", "a");
  assert.ok(result.ok);
  assert.equal(result.ended, "ended");
});

test("disconnect leaves by socket id and ends a 2-person call", () => {
  const registry = new CallRegistry();
  startCall(registry, ["a", "b"]);
  registry.join("call-1", "b", "s-b", 2000);
  assert.equal(registry.leaveBySocket("s-unknown"), null);
  const result = registry.leaveBySocket("s-b");
  assert.ok(result?.ok);
  assert.equal(result.ok && result.ended, "ended");
});

test("ring timeout ends an unanswered call and only stops ringing on an answered one", () => {
  const registry = new CallRegistry();
  startCall(registry, ["a", "b"]);
  const missed = registry.expireRinging("call-1");
  assert.ok(missed.ok);
  assert.equal(missed.ended, "no_answer");

  startCall(registry, ["a", "b", "c"], "a", "call-2");
  registry.join("call-2", "b", "s-b", 2000);
  const answered = registry.expireRinging("call-2");
  assert.ok(answered.ok && !answered.ended);
  assert.equal(answered.call.ringing.size, 0);
});

test("signals relay only between two members of the same call from their call socket", () => {
  const registry = new CallRegistry();
  startCall(registry, ["a", "b", "c"]);
  registry.join("call-1", "b", "s-b", 2000);
  assert.equal(registry.relayTarget("call-1", "a", "s-a", "b"), "s-b");
  assert.equal(registry.relayTarget("call-1", "a", "s-other-tab", "b"), null);
  assert.equal(registry.relayTarget("call-1", "a", "s-a", "c"), null, "ringing member is not in the call");
  assert.equal(registry.relayTarget("call-1", "a", "s-a", "a"), null);
  assert.equal(registry.relayTarget("call-1", "x", "s-x", "b"), null);
});

test("readSignal keeps known fields only and rejects bad shapes", () => {
  const offer = readSignal({ callId: "c1", to: "u2", from: "spoofed", data: { type: "offer", sdp: "v=0", extra: 1 } });
  assert.deepEqual(offer, { callId: "c1", to: "u2", data: { type: "offer", sdp: "v=0" } });
  const candidate = readSignal({ callId: "c1", to: "u2", data: { type: "candidate", candidate: { candidate: "x", sdpMid: "0", sdpMLineIndex: 0 } } });
  assert.deepEqual(candidate?.data, { type: "candidate", candidate: { candidate: "x", sdpMid: "0", sdpMLineIndex: 0, usernameFragment: null } });
  assert.equal(readSignal({ callId: "c1", to: "u2", data: { type: "offer", sdp: "x".repeat(16_001) } }), null);
  assert.equal(readSignal({ callId: "c1", to: "u2", data: { type: "hack" } }), null);
  assert.equal(readSignal({ callId: "../x", to: "u2", data: { type: "offer", sdp: "v=0" } }), null);
  assert.equal(readSignal({ callId: "c1", to: "u2", data: { type: "candidate", candidate: { candidate: "x", sdpMLineIndex: -1 } } }), null);
  assert.equal(readSignal("nope"), null);
});

test("mute is set only from the participant's call socket and shows in the call shape", () => {
  const registry = new CallRegistry();
  startCall(registry, ["a", "b"]);
  registry.join("call-1", "b", "s-b", 2000);
  expectFailure(registry.setMuted("call-1", "b", "s-other-tab", true), "no_call");
  expectFailure(registry.setMuted("call-1", "x", "s-x", true), "no_call");
  const result = registry.setMuted("call-1", "b", "s-b", true);
  assert.ok(result.ok);
  assert.deepEqual(presentCall(result.call).participants.map((p) => [p.userId, p.muted]), [["a", false], ["b", true]]);
  assert.deepEqual(readMute({ callId: "call-1", muted: true }), { callId: "call-1", muted: true });
  assert.equal(readMute({ callId: "call-1", muted: "yes" }), null);
});

test("separate removes the blocked user from a 3-person call and keeps the blocker", () => {
  const registry = new CallRegistry();
  startCall(registry, ["a", "b", "c"]);
  registry.join("call-1", "b", "s-b", 2000);
  registry.join("call-1", "c", "s-c", 2000);
  const [result] = registry.separate("a", "b");
  assert.ok(result.ok && !result.ended);
  assert.deepEqual([...result.call.participants.keys()], ["a", "c"]);
  assert.ok(startCall(registry, ["b", "d"], "b", "call-2", "conv-2").ok, "blocked user is free for other calls");
});

test("separate ends a 2-person call", () => {
  const registry = new CallRegistry();
  startCall(registry, ["a", "b"]);
  registry.join("call-1", "b", "s-b", 2000);
  const [result] = registry.separate("b", "a");
  assert.ok(result.ok);
  assert.equal(result.ended, "ended");
  assert.equal(registry.get("call-1"), null);
});

test("separate stops ringing on either side and ends an unanswered call", () => {
  const registry = new CallRegistry();
  startCall(registry, ["a", "b"]);
  const [blockedRinging] = registry.separate("a", "b");
  assert.ok(blockedRinging.ok);
  assert.equal(blockedRinging.ended, "ended");

  startCall(registry, ["a", "b", "c"], "a", "call-2");
  const [blockerRinging] = registry.separate("b", "a");
  assert.ok(blockerRinging.ok && !blockerRinging.ended);
  assert.deepEqual([...blockerRinging.call.ringing], ["c"]);
  assert.deepEqual(registry.separate("x", "y"), []);
});

test("rate limiter allows a burst of 60 per socket, then refills over 10s", () => {
  const limiter = new CallRateLimiter(60, 10_000);
  for (let i = 0; i < 60; i += 1) assert.ok(limiter.take("s1", 0));
  assert.equal(limiter.take("s1", 0), false);
  assert.ok(limiter.take("s2", 0), "buckets are per socket");
  assert.equal(limiter.take("s1", 100), false, "0.6 tokens after 100ms");
  assert.ok(limiter.take("s1", 200), "1.2 tokens after 200ms");
  for (let i = 0; i < 60; i += 1) assert.ok(limiter.take("s1", 20_000));
  assert.equal(limiter.take("s1", 20_000), false, "capacity caps the refill");
  limiter.forget("s1");
  assert.ok(limiter.take("s1", 20_000), "forget resets the bucket");
});

console.log(`${passed} passed`);

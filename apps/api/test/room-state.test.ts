// Run: npm run test:api (from the repo root)
import { strict as assert } from "node:assert";
import { MAX_ROOM_SIZE, RoomRegistry, presentRoom } from "../src/modules/realtime/room-state";
import { readRoomSignal, readRoomVoice } from "../src/modules/realtime/call-payloads";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

function join(registry: RoomRegistry, userId: string, teamId = "team-1") {
  return registry.join({ teamId, userId, displayName: `Name ${userId}`, socketId: `s-${userId}`, now: 1000 });
}

const occupants = (registry: RoomRegistry, teamId = "team-1") => presentRoom(teamId, registry.get(teamId)).participants.map((p) => p.userId);

test("a member can sit alone in the room without ringing anyone", () => {
  const registry = new RoomRegistry();
  const result = join(registry, "a");
  assert.ok(result.ok);
  assert.deepEqual(occupants(registry), ["a"]);
});

test("members join and leave freely and the room stays while anyone is left", () => {
  const registry = new RoomRegistry();
  join(registry, "a");
  join(registry, "b");
  assert.ok(registry.leave("team-1", "a").ok);
  assert.deepEqual(occupants(registry), ["b"]);
});

test("the room disappears once the last occupant leaves", () => {
  const registry = new RoomRegistry();
  join(registry, "a");
  registry.leave("team-1", "a");
  assert.equal(registry.get("team-1"), null);
  assert.deepEqual(presentRoom("team-1", null).participants, []);
});

test("a user is in one room at a time", () => {
  const registry = new RoomRegistry();
  join(registry, "a", "team-1");
  const second = join(registry, "a", "team-2");
  assert.equal(second.ok, false);
  if (!second.ok) assert.equal(second.reason, "busy");
});

test("the room is full at the mesh limit", () => {
  const registry = new RoomRegistry();
  const ids = Array.from({ length: MAX_ROOM_SIZE }, (_, index) => `u${index}`);
  for (const id of ids) assert.ok(join(registry, id).ok);
  const extra = join(registry, "late");
  assert.equal(extra.ok, false);
  if (!extra.ok) assert.equal(extra.reason, "full");
});

test("disconnecting a socket leaves its room", () => {
  const registry = new RoomRegistry();
  join(registry, "a");
  join(registry, "b");
  const result = registry.leaveBySocket("s-a");
  assert.ok(result?.ok);
  assert.deepEqual(occupants(registry), ["b"]);
  assert.equal(registry.isInRoom("a"), false);
});

test("deafen also mutes, and only the own room socket can change it", () => {
  const registry = new RoomRegistry();
  join(registry, "a");
  assert.equal(registry.setVoice("team-1", "a", "other-socket", true, false).ok, false);
  registry.setVoice("team-1", "a", "s-a", false, true);
  const [self] = presentRoom("team-1", registry.get("team-1")).participants;
  assert.equal(self.muted, true);
  assert.equal(self.deafened, true);
});

test("a block removes the blocked user from the blocker's room", () => {
  const registry = new RoomRegistry();
  join(registry, "a");
  join(registry, "b");
  join(registry, "c");
  registry.separate("a", "b");
  assert.deepEqual(occupants(registry), ["a", "c"]);
  assert.deepEqual(registry.separate("a", "x"), []);
});

test("signals relay only between occupants of the same room from their room socket", () => {
  const registry = new RoomRegistry();
  join(registry, "a");
  join(registry, "b");
  join(registry, "c", "team-2");
  assert.equal(registry.relayTarget("team-1", "a", "s-a", "b"), "s-b");
  assert.equal(registry.relayTarget("team-1", "a", "wrong", "b"), null);
  assert.equal(registry.relayTarget("team-1", "a", "s-a", "c"), null);
  assert.equal(registry.relayTarget("team-1", "a", "s-a", "a"), null);
});

test("closing a room frees everyone inside", () => {
  const registry = new RoomRegistry();
  join(registry, "a");
  join(registry, "b");
  assert.deepEqual(registry.close("team-1").sort(), ["a", "b"]);
  assert.equal(registry.isInRoom("a"), false);
  assert.ok(join(registry, "a", "team-2").ok);
});

test("room payload parsers reject anything malformed", () => {
  assert.deepEqual(readRoomVoice({ teamId: "t1", muted: true, deafened: false }), { teamId: "t1", muted: true, deafened: false });
  assert.equal(readRoomVoice({ teamId: "t1", muted: true }), null);
  assert.equal(readRoomVoice({ teamId: "bad id!", muted: true, deafened: true }), null);
  assert.deepEqual(readRoomSignal({ teamId: "t1", to: "b", data: { type: "offer", sdp: "v=0" }, extra: 1 }), {
    teamId: "t1",
    to: "b",
    data: { type: "offer", sdp: "v=0" },
  });
  assert.equal(readRoomSignal({ teamId: "t1", to: "b", data: { type: "offer" } }), null);
});

console.log(`${passed} passed`);

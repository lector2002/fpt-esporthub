"use client";

import { api } from "@/lib/api-client";
import { getSocket } from "@/features/chat/socket";
import { AudioLevels } from "./audio-levels";
import { PeerMesh } from "./peer-mesh";
import { getVoiceState, removeCall, setVoiceState, updateSession, upsertCall, upsertRoom } from "./store";
import type {
  CallAck,
  CallEndedEvent,
  CallFailure,
  CallInfo,
  CallSession,
  IceServersResponse,
  RoomAck,
  RoomInfo,
  RoomSignalEvent,
  SignalEvent,
} from "./types";

/**
 * The viewer's single voice session (a call or a team room): mic stream, peer mesh and level meter live here
 * (outside React), so the chat header, the incoming dialog, the call bar and the room page all drive the same one.
 */

const ACK_TIMEOUT_MS = 10_000;
const SELF = "self";

export type CallOutcome = { ok: true } | { ok: false; reason: CallFailure };

interface Media {
  stream: MediaStream;
  mesh: PeerMesh;
  levels: AudioLevels;
}

let media: Media | null = null;
let selfId: string | null = null;
/** Mute state to restore when undeafening, like Discord. */
let mutedBeforeDeafen = false;

type MicFailure = "mic_denied" | "mic_unavailable";
type Ack<T> = T | { ok: false; reason: "offline" };

async function emitWithAck<T extends CallAck | RoomAck>(event: string, payload: unknown): Promise<Ack<T>> {
  const socket = getSocket();
  if (!socket?.connected) return { ok: false, reason: "offline" };
  try {
    return (await socket.timeout(ACK_TIMEOUT_MS).emitWithAck(event, payload)) as T;
  } catch {
    return { ok: false, reason: "invalid" } as T;
  }
}

async function openMic(): Promise<MediaStream | MicFailure> {
  if (!navigator.mediaDevices?.getUserMedia) return "mic_unavailable";
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    return name === "NotAllowedError" || name === "SecurityError" ? "mic_denied" : "mic_unavailable";
  }
}

function stopStream(stream: MediaStream) {
  for (const track of stream.getTracks()) track.stop();
}

/** Tears everything down. Safe to call from any exit path, any number of times. */
function teardown() {
  if (media) {
    media.mesh.closeAll();
    media.levels.close();
    stopStream(media.stream);
    media = null;
  }
  setVoiceState((current) => (current.session ? { ...current, session: null } : current));
}

function sendSignal(kind: CallSession["kind"], id: string, to: string, data: unknown) {
  if (kind === "call") getSocket()?.emit("call:signal", { callId: id, to, data });
  else getSocket()?.emit("room:signal", { teamId: id, to, data });
}

function emitLeave(kind: CallSession["kind"], id: string) {
  if (kind === "call") getSocket()?.emit("call:leave", { callId: id });
  else getSocket()?.emit("room:leave", { teamId: id });
}

function buildMedia(kind: CallSession["kind"], id: string, stream: MediaStream, iceServers: RTCIceServer[]): Media {
  const levels = new AudioLevels((speaking) =>
    updateSession((session) => ({ ...session, speaking: remapSelf(speaking) })),
  );
  levels.add(SELF, stream);
  const mesh = new PeerMesh({
    iceServers,
    stream,
    send: (to, data) => sendSignal(kind, id, to, data),
    onState: (userId, state) => updateSession((session) => ({ ...session, peers: { ...session.peers, [userId]: state } })),
    onRemoteStream: (userId, remote) => levels.add(userId, remote),
    onClosed: (userId) => {
      levels.remove(userId);
      updateSession((session) => {
        const peers = { ...session.peers };
        delete peers[userId];
        return { ...session, peers };
      });
    },
  });
  return { stream, mesh, levels };
}

function remapSelf(speaking: Record<string, boolean>) {
  if (!selfId || !(SELF in speaking)) return speaking;
  const { [SELF]: self, ...rest } = speaking;
  return { ...rest, [selfId]: self };
}

/** What the server handed back on start/join: who to connect to and how to record it. */
type Entry = { ok: true; id: string; participantIds: string[]; save: () => void } | { ok: false; reason: CallFailure };

const sameSession = (kind: CallSession["kind"], key: string) => {
  const session = getVoiceState().session;
  return session?.kind === kind && session.key === key;
};

/** Mic first, then ICE servers, then signaling: a failed mic never rings anyone. */
async function enterVoice(
  target: Pick<CallSession, "kind" | "key" | "label" | "href">,
  userId: string,
  signal: () => Promise<Entry>,
): Promise<CallOutcome> {
  if (getVoiceState().session) return { ok: false, reason: "busy" };
  if (!getSocket()?.connected) return { ok: false, reason: "offline" };
  const { kind, key } = target;
  selfId = userId;
  mutedBeforeDeafen = false;
  setVoiceState((current) => ({
    ...current,
    micError: null,
    session: { ...target, callId: null, muted: false, deafened: false, peers: {}, speaking: {} },
  }));

  const stream = await openMic();
  if (typeof stream === "string") {
    setVoiceState((current) => ({ ...current, session: null, micError: stream }));
    return { ok: false, reason: stream };
  }
  let iceServers: RTCIceServer[];
  try {
    iceServers = (await api<IceServersResponse>("/realtime/ice-servers")).iceServers;
  } catch {
    stopStream(stream);
    teardown();
    return { ok: false, reason: "ice_failed" };
  }
  // Left (or logged out) while preparing.
  if (!sameSession(kind, key)) {
    stopStream(stream);
    return { ok: false, reason: "invalid" };
  }

  const entry = await signal();
  if (!entry.ok) {
    stopStream(stream);
    teardown();
    return entry;
  }
  if (!sameSession(kind, key)) {
    emitLeave(kind, entry.id);
    stopStream(stream);
    return { ok: false, reason: "invalid" };
  }
  media = buildMedia(kind, entry.id, stream, iceServers);
  updateSession((session) => ({ ...session, callId: entry.id }));
  entry.save();
  for (const participantId of entry.participantIds) {
    if (participantId !== userId) media.mesh.connect(participantId);
  }
  return { ok: true };
}

function callEntry(ack: Ack<CallAck>): Entry {
  if (!ack.ok) return { ok: false, reason: ack.reason };
  const call = ack.call;
  if (!call) return { ok: false, reason: "invalid" };
  return { ok: true, id: call.id, participantIds: call.participants.map((p) => p.userId), save: () => upsertCall(call) };
}

export function startCall(conversationId: string, userId: string): Promise<CallOutcome> {
  return enterVoice({ kind: "call", key: conversationId }, userId, async () => {
    const ack = await emitWithAck<CallAck>("call:start", { conversationId });
    if (ack.ok || ack.reason !== "call_active" || !("callId" in ack) || !ack.callId) return callEntry(ack);
    // Someone else started one meanwhile: join it instead.
    return callEntry(await emitWithAck<CallAck>("call:join", { callId: ack.callId }));
  });
}

export function joinCall(call: CallInfo, userId: string) {
  return enterVoice({ kind: "call", key: call.conversationId }, userId, async () =>
    callEntry(await emitWithAck<CallAck>("call:join", { callId: call.id })),
  );
}

/**
 * Joins a voice room: a team room, or a community voice channel (`teamId` is then the channel id).
 * Already in another call or room: leave it first, like switching Discord channels.
 */
export function joinRoom(teamId: string, label: string, userId: string, href?: string) {
  const current = getVoiceState().session;
  if (current && !(current.kind === "room" && current.key === teamId)) leaveCall();
  return enterVoice({ kind: "room", key: teamId, label, href }, userId, async () => {
    const ack = await emitWithAck<RoomAck>("room:join", { teamId });
    if (!ack.ok) return { ok: false, reason: ack.reason === "no_room" ? "invalid" : ack.reason };
    const room = ack.room;
    if (!room) return { ok: false, reason: "invalid" };
    return { ok: true, id: teamId, participantIds: room.participants.map((p) => p.userId), save: () => upsertRoom(room) };
  });
}

export function declineCall(callId: string) {
  void emitWithAck<CallAck>("call:decline", { callId });
}

/** Leaves the current call or room. */
export function leaveCall() {
  const session = getVoiceState().session;
  if (session?.callId) emitLeave(session.kind, session.callId);
  teardown();
}

function applyVoice(muted: boolean, deafened: boolean) {
  if (!media) return;
  for (const track of media.stream.getAudioTracks()) track.enabled = !muted;
  media.mesh.setDeafened(deafened);
  updateSession((session) => ({ ...session, muted, deafened }));
  const session = getVoiceState().session;
  if (!session?.callId) return;
  if (session.kind === "call") getSocket()?.emit("call:mute", { callId: session.callId, muted });
  else getSocket()?.emit("room:voice", { teamId: session.key, muted, deafened });
}

/** Unmuting while deafened also undeafens. */
export function toggleMute() {
  const session = getVoiceState().session;
  if (!session) return;
  if (session.deafened) applyVoice(false, false);
  else applyVoice(!session.muted, false);
}

/** Deafen silences everyone and mutes the mic; undeafen restores the earlier mute. */
export function toggleDeafen() {
  const session = getVoiceState().session;
  if (!session) return;
  if (session.deafened) {
    applyVoice(mutedBeforeDeafen, false);
    return;
  }
  mutedBeforeDeafen = session.muted;
  applyVoice(true, true);
}

// Server events. Each returns true when the viewer's own session was affected, so the caller can toast.

export function handleCallState(call: CallInfo) {
  upsertCall(call);
  const session = getVoiceState().session;
  if (!media || session?.kind !== "call" || session.callId !== call.id || !selfId) return false;
  const ids = call.participants.map((p) => p.userId);
  if (!ids.includes(selfId)) {
    teardown();
    return true;
  }
  media.mesh.sync(ids.filter((id) => id !== selfId));
  return false;
}

export function handleCallEnded(event: CallEndedEvent) {
  removeCall(event.conversationId);
  const session = getVoiceState().session;
  if (session?.kind !== "call" || session.callId !== event.callId) return false;
  teardown();
  return true;
}

/** True when the viewer was taken out of the room (removed from the team, or blocked by someone inside). */
export function handleRoomState(room: RoomInfo) {
  upsertRoom(room);
  const session = getVoiceState().session;
  if (!media || session?.kind !== "room" || session.key !== room.teamId || !selfId) return false;
  const ids = room.participants.map((p) => p.userId);
  if (!ids.includes(selfId)) {
    teardown();
    return true;
  }
  media.mesh.sync(ids.filter((id) => id !== selfId));
  return false;
}

export function handleSignal(event: SignalEvent) {
  const session = getVoiceState().session;
  if (media && session?.kind === "call" && session.callId === event.callId) media.mesh.handle(event.from, event.data);
}

export function handleRoomSignal(event: RoomSignalEvent) {
  const session = getVoiceState().session;
  if (media && session?.kind === "room" && session.key === event.teamId) media.mesh.handle(event.from, event.data);
}

export function setKnownCalls(calls: CallInfo[]) {
  setVoiceState((current) => ({ ...current, calls: Object.fromEntries(calls.map((call) => [call.conversationId, call])) }));
}

function setKnownRooms(rooms: RoomInfo[]) {
  setVoiceState((current) => ({ ...current, rooms: Object.fromEntries(rooms.map((room) => [room.teamId, room])) }));
}

export async function syncCalls() {
  const socket = getSocket();
  if (!socket?.connected) return;
  try {
    const [calls, rooms] = (await Promise.all([
      socket.timeout(ACK_TIMEOUT_MS).emitWithAck("call:sync", {}),
      socket.timeout(ACK_TIMEOUT_MS).emitWithAck("room:sync", {}),
    ])) as [{ ok: boolean; calls?: CallInfo[] }, { ok: boolean; rooms?: RoomInfo[] }];
    if (calls.ok && calls.calls) setKnownCalls(calls.calls);
    if (rooms.ok && rooms.rooms) setKnownRooms(rooms.rooms);
  } catch {
    // Next reconnect retries.
  }
}

/** Socket gone: the server already dropped us from the call or room. */
export function handleDisconnect() {
  const hadCall = Boolean(getVoiceState().session);
  teardown();
  setKnownCalls([]);
  setKnownRooms([]);
  return hadCall;
}

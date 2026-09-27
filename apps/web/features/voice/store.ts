"use client";

import { useSyncExternalStore } from "react";
import type { CallFailure, CallInfo, CallSession, RoomInfo } from "./types";

export interface VoiceState {
  /** Active calls in the viewer's conversations, by conversation id. */
  calls: Record<string, CallInfo>;
  /** Non-empty voice rooms of the viewer's teams, by team id. */
  rooms: Record<string, RoomInfo>;
  session: CallSession | null;
  /** Last mic failure; cleared on the next attempt. */
  micError: Extract<CallFailure, "mic_denied" | "mic_unavailable"> | null;
}

const INITIAL: VoiceState = { calls: {}, rooms: {}, session: null, micError: null };

let state: VoiceState = INITIAL;
const listeners = new Set<() => void>();

export function getVoiceState() {
  return state;
}

export function setVoiceState(update: (current: VoiceState) => VoiceState) {
  const next = update(state);
  if (next === state) return;
  state = next;
  for (const listener of listeners) listener();
}

export function updateSession(update: (session: CallSession) => CallSession) {
  setVoiceState((current) => (current.session ? { ...current, session: update(current.session) } : current));
}

export function upsertCall(call: CallInfo) {
  setVoiceState((current) => ({ ...current, calls: { ...current.calls, [call.conversationId]: call } }));
}

export function removeCall(conversationId: string) {
  setVoiceState((current) => {
    if (!current.calls[conversationId]) return current;
    const calls = { ...current.calls };
    delete calls[conversationId];
    return { ...current, calls };
  });
}

/** An empty room is dropped. */
export function upsertRoom(room: RoomInfo) {
  setVoiceState((current) => {
    const rooms = { ...current.rooms };
    if (room.participants.length > 0) rooms[room.teamId] = room;
    else if (rooms[room.teamId]) delete rooms[room.teamId];
    else return current;
    return { ...current, rooms };
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getServerState = () => INITIAL;

export function useVoiceState() {
  return useSyncExternalStore(subscribe, getVoiceState, getServerState);
}

/** The viewer's current call, if the session has one and the server has told us about it. */
export function currentCall(voice: VoiceState) {
  const session = voice.session;
  if (session?.kind !== "call" || !session.callId) return null;
  const call = voice.calls[session.key];
  return call?.id === session.callId ? call : null;
}

/** The viewer's current voice room, once joined. */
export function currentRoom(voice: VoiceState) {
  const session = voice.session;
  if (session?.kind !== "room" || !session.callId) return null;
  return voice.rooms[session.key] ?? null;
}

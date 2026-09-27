/** Hand-rolled narrowing for socket payloads (gateways have no ValidationPipe). Anything unexpected -> null. */

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_SDP_LENGTH = 16_000;
const MAX_CANDIDATE_LENGTH = 1_024;
const MAX_SHORT_LENGTH = 64;

export type SignalData =
  | { type: "offer" | "answer"; sdp: string }
  | {
      type: "candidate";
      candidate: { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null; usernameFragment: string | null };
    };

export interface SignalPayload {
  callId: string;
  to: string;
  data: SignalData;
}

export interface RoomSignalPayload {
  teamId: string;
  to: string;
  data: SignalData;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function readId(value: unknown): string | null {
  return typeof value === "string" && ID_PATTERN.test(value) ? value : null;
}

export function readField(body: unknown, key: "conversationId" | "callId" | "teamId"): string | null {
  return readId(asRecord(body)?.[key]);
}

export function readMute(body: unknown): { callId: string; muted: boolean } | null {
  const callId = readField(body, "callId");
  const muted = asRecord(body)?.muted;
  return callId && typeof muted === "boolean" ? { callId, muted } : null;
}

export function readRoomVoice(body: unknown): { teamId: string; muted: boolean; deafened: boolean } | null {
  const teamId = readField(body, "teamId");
  const record = asRecord(body);
  const muted = record?.muted;
  const deafened = record?.deafened;
  return teamId && typeof muted === "boolean" && typeof deafened === "boolean" ? { teamId, muted, deafened } : null;
}

function readOptionalString(value: unknown, max: number): string | null | undefined {
  if (value === undefined || value === null) return null;
  return typeof value === "string" && value.length <= max ? value : undefined;
}

function readCandidate(value: unknown): Extract<SignalData, { type: "candidate" }>["candidate"] | null {
  const record = asRecord(value);
  if (!record || typeof record.candidate !== "string" || record.candidate.length > MAX_CANDIDATE_LENGTH) return null;
  const sdpMid = readOptionalString(record.sdpMid, MAX_SHORT_LENGTH);
  const usernameFragment = readOptionalString(record.usernameFragment, MAX_SHORT_LENGTH);
  const index = record.sdpMLineIndex;
  const sdpMLineIndex = index === undefined || index === null ? null : index;
  if (sdpMid === undefined || usernameFragment === undefined) return null;
  if (sdpMLineIndex !== null && !(Number.isInteger(sdpMLineIndex) && (sdpMLineIndex as number) >= 0 && (sdpMLineIndex as number) < 64)) {
    return null;
  }
  return { candidate: record.candidate, sdpMid, sdpMLineIndex: sdpMLineIndex as number | null, usernameFragment };
}

function readSignalData(value: unknown): SignalData | null {
  const record = asRecord(value);
  if (!record) return null;
  if (record.type === "offer" || record.type === "answer") {
    const sdp = record.sdp;
    return typeof sdp === "string" && sdp.length > 0 && sdp.length <= MAX_SDP_LENGTH ? { type: record.type, sdp } : null;
  }
  if (record.type === "candidate") {
    const candidate = readCandidate(record.candidate);
    return candidate ? { type: "candidate", candidate } : null;
  }
  return null;
}

/** Rebuilds the payload from known fields only, so nothing extra is relayed. */
export function readSignal(body: unknown): SignalPayload | null {
  const record = asRecord(body);
  if (!record) return null;
  const callId = readId(record.callId);
  const to = readId(record.to);
  const data = readSignalData(record.data);
  return callId && to && data ? { callId, to, data } : null;
}

export function readRoomSignal(body: unknown): RoomSignalPayload | null {
  const record = asRecord(body);
  if (!record) return null;
  const teamId = readId(record.teamId);
  const to = readId(record.to);
  const data = readSignalData(record.data);
  return teamId && to && data ? { teamId, to, data } : null;
}

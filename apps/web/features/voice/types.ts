/** Wire shapes of the `/realtime` voice call events (see apps/api/src/modules/realtime/call-state.ts). */

export interface CallParticipant {
  userId: string;
  displayName: string;
  joinedAt: string;
  muted: boolean;
}

export interface CallInfo {
  id: string;
  conversationId: string;
  startedBy: string;
  startedAt: string;
  /** Set when the second participant joins. */
  connectedAt: string | null;
  participants: CallParticipant[];
  ringing: { userId: string; displayName: string }[];
  maxParticipants: number;
}

export type CallEndReason = "ended" | "declined" | "no_answer";

export interface CallEndedEvent {
  callId: string;
  conversationId: string;
  reason: CallEndReason;
}

export type SignalData =
  | { type: "offer" | "answer"; sdp: string }
  | { type: "candidate"; candidate: RTCIceCandidateInit };

export interface SignalEvent {
  callId: string;
  from: string;
  data: SignalData;
}

export type ServerFailure =
  | "busy"
  | "unavailable"
  | "call_active"
  | "no_call"
  | "not_member"
  | "full"
  | "blocked"
  | "restricted"
  | "invalid"
  | "rate_limited";

/** Server failures plus client-side ones (mic, ICE fetch, socket). */
export type CallFailure = ServerFailure | "mic_denied" | "mic_unavailable" | "ice_failed" | "offline";

export type CallAck = { ok: true; call?: CallInfo } | { ok: false; reason: ServerFailure; callId?: string };

export interface IceServersResponse {
  iceServers: RTCIceServer[];
  ttlSeconds: number;
}

/** Team voice room (see apps/api/src/modules/realtime/room-state.ts). Nobody rings; members join and leave. */
export interface RoomParticipant {
  userId: string;
  displayName: string;
  joinedAt: string;
  muted: boolean;
  deafened: boolean;
}

export interface RoomInfo {
  teamId: string;
  participants: RoomParticipant[];
  maxParticipants: number;
}

export type RoomAck = { ok: true; room?: RoomInfo } | { ok: false; reason: ServerFailure | "no_room" };

export interface RoomSignalEvent {
  teamId: string;
  from: string;
  data: SignalData;
}

/** The viewer's own voice session, from pressing call/accept/join until leaving. */
export interface CallSession {
  /** "call": a ringing call in a request conversation. "room": a team voice room. */
  kind: "call" | "room";
  /** Conversation id for calls, team id or community voice channel id for rooms. */
  key: string;
  /** Rooms: the team (or "community / channel") name, for the call bar. */
  label?: string;
  /** Rooms: the page the room lives on; the team room when unset. */
  href?: string;
  /** Call id (the team id for rooms) once the server accepted us. Null while the mic and ICE servers are being prepared. */
  callId: string | null;
  muted: boolean;
  deafened: boolean;
  /** `RTCPeerConnection.connectionState` per remote user. */
  peers: Record<string, RTCPeerConnectionState>;
  /** Speaking flag per user, including the viewer. */
  speaking: Record<string, boolean>;
}

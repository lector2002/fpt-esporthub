/**
 * In-memory voice call registry. Pure (no Nest, no DB) so the rules can be unit tested.
 * Calls are ephemeral: nothing here survives an API restart.
 */

export const MAX_CALL_SIZE = 5;
export const RING_TIMEOUT_MS = 30_000;

export type CallFailure = "busy" | "unavailable" | "call_active" | "no_call" | "not_member" | "full";
export type CallEndReason = "ended" | "declined" | "no_answer";

interface Participant {
  userId: string;
  socketId: string;
  joinedAt: number;
  muted: boolean;
}

export interface Call {
  id: string;
  conversationId: string;
  startedBy: string;
  startedAt: number;
  /** Set when the second participant joins. */
  connectedAt: number | null;
  /** Conversation participants when the call started; only they may join. */
  memberIds: string[];
  names: Record<string, string>;
  participants: Map<string, Participant>;
  ringing: Set<string>;
}

export type CallResult = { ok: true; call: Call; ended?: CallEndReason } | { ok: false; reason: CallFailure; callId?: string };

export interface StartInput {
  id: string;
  conversationId: string;
  userId: string;
  socketId: string;
  memberIds: string[];
  names: Record<string, string>;
  now: number;
}

export class CallRegistry {
  private calls = new Map<string, Call>();
  private byConversation = new Map<string, string>();
  private byUser = new Map<string, string>();

  get(callId: string) {
    return this.calls.get(callId) ?? null;
  }

  isInCall(userId: string) {
    return this.byUser.has(userId);
  }

  /** Active calls in conversations the user belongs to. */
  listForMember(userId: string) {
    return [...this.calls.values()].filter((call) => call.memberIds.includes(userId));
  }

  start(input: StartInput): CallResult {
    const { userId, conversationId } = input;
    if (!input.memberIds.includes(userId)) return { ok: false, reason: "not_member" };
    if (this.byUser.has(userId)) return { ok: false, reason: "busy" };
    const existing = this.byConversation.get(conversationId);
    if (existing) return { ok: false, reason: "call_active", callId: existing };

    const ringing = new Set(input.memberIds.filter((id) => id !== userId && !this.byUser.has(id)));
    if (ringing.size === 0) return { ok: false, reason: "unavailable" };

    const call: Call = {
      id: input.id,
      conversationId,
      startedBy: userId,
      startedAt: input.now,
      connectedAt: null,
      memberIds: [...input.memberIds],
      names: { ...input.names },
      participants: new Map([[userId, { userId, socketId: input.socketId, joinedAt: input.now, muted: false }]]),
      ringing,
    };
    this.calls.set(call.id, call);
    this.byConversation.set(conversationId, call.id);
    this.byUser.set(userId, call.id);
    return { ok: true, call };
  }

  join(callId: string, userId: string, socketId: string, now: number): CallResult {
    const call = this.calls.get(callId);
    if (!call) return { ok: false, reason: "no_call" };
    if (!call.memberIds.includes(userId)) return { ok: false, reason: "not_member" };
    if (this.byUser.has(userId)) return { ok: false, reason: "busy" };
    if (call.participants.size >= MAX_CALL_SIZE) return { ok: false, reason: "full" };

    call.participants.set(userId, { userId, socketId, joinedAt: now, muted: false });
    call.ringing.delete(userId);
    this.byUser.set(userId, callId);
    if (call.participants.size >= 2 && call.connectedAt === null) call.connectedAt = now;
    return { ok: true, call };
  }

  decline(callId: string, userId: string): CallResult {
    const call = this.calls.get(callId);
    if (!call) return { ok: false, reason: "no_call" };
    if (!call.memberIds.includes(userId)) return { ok: false, reason: "not_member" };
    call.ringing.delete(userId);
    return this.endIfUnanswered(call, "declined");
  }

  /** Mute flag, only from the participant's own call socket. */
  setMuted(callId: string, userId: string, socketId: string, muted: boolean): CallResult {
    const call = this.calls.get(callId);
    const participant = call?.participants.get(userId);
    if (!call || !participant || participant.socketId !== socketId) return { ok: false, reason: "no_call" };
    participant.muted = muted;
    return { ok: true, call };
  }

  /**
   * A new Block: the blocker stays, the blocked user leaves every call they share (or stops ringing there).
   * If the blocker is the one ringing in the blocked user's call, the blocker stops ringing instead.
   */
  separate(blockerId: string, blockedId: string): CallResult[] {
    const results: CallResult[] = [];
    for (const call of [...this.calls.values()]) {
      const { participants, ringing } = call;
      if (participants.has(blockerId) && participants.has(blockedId)) {
        participants.delete(blockedId);
        this.byUser.delete(blockedId);
        results.push(this.endIfEmpty(call));
      } else if (participants.has(blockerId) && ringing.delete(blockedId)) {
        results.push(this.endIfUnanswered(call, "ended"));
      } else if (participants.has(blockedId) && ringing.delete(blockerId)) {
        results.push(this.endIfUnanswered(call, "ended"));
      }
    }
    return results;
  }

  leave(callId: string, userId: string): CallResult {
    const call = this.calls.get(callId);
    if (!call || !call.participants.has(userId)) return { ok: false, reason: "no_call" };
    call.participants.delete(userId);
    this.byUser.delete(userId);
    return this.endIfEmpty(call);
  }

  /** Disconnect cleanup: leaves whatever call this socket had joined. */
  leaveBySocket(socketId: string): CallResult | null {
    for (const call of this.calls.values()) {
      for (const participant of call.participants.values()) {
        if (participant.socketId === socketId) return this.leave(call.id, participant.userId);
      }
    }
    return null;
  }

  /** Ring timeout: stop ringing everyone; the call ends if nobody picked up. */
  expireRinging(callId: string): CallResult {
    const call = this.calls.get(callId);
    if (!call) return { ok: false, reason: "no_call" };
    call.ringing.clear();
    if (call.participants.size < 2) return this.end(call, "no_answer");
    return { ok: true, call };
  }

  /** Target socket for a signal, or null unless both users are in the same call and the sender uses its call socket. */
  relayTarget(callId: string, fromUserId: string, fromSocketId: string, toUserId: string) {
    const call = this.calls.get(callId);
    if (!call || fromUserId === toUserId) return null;
    const sender = call.participants.get(fromUserId);
    const target = call.participants.get(toUserId);
    if (!sender || !target || sender.socketId !== fromSocketId) return null;
    return target.socketId;
  }

  /** Ends a call nobody answered once nobody is left ringing. */
  private endIfUnanswered(call: Call, reason: CallEndReason): CallResult {
    if (call.ringing.size === 0 && call.participants.size < 2) return this.end(call, reason);
    return { ok: true, call };
  }

  /** Ends when nobody is left, or when a connected call drops below 2. A lone caller keeps ringing. */
  private endIfEmpty(call: Call): CallResult {
    const size = call.participants.size;
    if (size === 0 || (size < 2 && call.connectedAt !== null)) return this.end(call, "ended");
    return { ok: true, call };
  }

  private end(call: Call, reason: CallEndReason): CallResult {
    for (const userId of call.participants.keys()) this.byUser.delete(userId);
    call.participants.clear();
    call.ringing.clear();
    this.calls.delete(call.id);
    this.byConversation.delete(call.conversationId);
    return { ok: true, call, ended: reason };
  }
}

/** Wire shape sent to clients. */
export function presentCall(call: Call) {
  return {
    id: call.id,
    conversationId: call.conversationId,
    startedBy: call.startedBy,
    startedAt: new Date(call.startedAt).toISOString(),
    connectedAt: call.connectedAt === null ? null : new Date(call.connectedAt).toISOString(),
    participants: [...call.participants.values()].map((p) => ({
      userId: p.userId,
      displayName: call.names[p.userId] ?? "",
      joinedAt: new Date(p.joinedAt).toISOString(),
      muted: p.muted,
    })),
    ringing: [...call.ringing].map((userId) => ({ userId, displayName: call.names[userId] ?? "" })),
    maxParticipants: MAX_CALL_SIZE,
  };
}

export type PresentedCall = ReturnType<typeof presentCall>;

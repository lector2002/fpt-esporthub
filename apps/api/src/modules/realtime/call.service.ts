import { randomUUID } from "node:crypto";
import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { assertCanInteract } from "../../common/account";
import { hasBlockWith } from "../conversations/block-check";
import { RealtimeService } from "./realtime.service";
import { CallRegistry, RING_TIMEOUT_MS, presentCall } from "./call-state";
import { CallRateLimiter } from "./call-rate-limit";
import { RoomRegistry, presentRoom } from "./room-state";
import type { Call, CallFailure, CallResult } from "./call-state";
import type { RoomSignalPayload, SignalPayload } from "./call-payloads";
import type { PresentedRoom, RoomFailure, RoomResult } from "./room-state";

export type CallAck =
  | { ok: true; call?: ReturnType<typeof presentCall> }
  | { ok: false; reason: CallFailure | "blocked" | "restricted" | "invalid" | "rate_limited"; callId?: string };

export type RoomAck =
  | { ok: true; room?: PresentedRoom }
  | { ok: false; reason: RoomFailure | "not_member" | "blocked" | "restricted" | "invalid" | "rate_limited" };

type Denied = { ok: false; reason: "blocked" | "restricted" };

/**
 * Voice rules on top of the in-memory registries: ringing calls inside request conversations and join-anytime
 * voice rooms. Membership, blocks, restrictions, ring timeout, fan-out. A user is in at most one call or room.
 * A room id is a team id (team room) or a community voice channel id; the wire field stays `teamId` for both.
 */
@Injectable()
export class CallService implements OnModuleDestroy {
  private readonly logger = new Logger(CallService.name);
  private registry = new CallRegistry();
  private rooms = new RoomRegistry();
  /** Who hears about each non-empty room: the team roster at the last join. */
  private roomAudience = new Map<string, string[]>();
  private ringTimers = new Map<string, NodeJS.Timeout>();
  private limiter = new CallRateLimiter();
  /** Sockets already logged as over the cap, so each is logged once. */
  private limitedSockets = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeService,
  ) {}

  onModuleDestroy() {
    for (const timer of this.ringTimers.values()) clearTimeout(timer);
  }

  /** Rate cap shared by every `call:*` event. Returns the ack to send when the socket is over it. */
  throttle(socketId: string): CallAck | null {
    if (this.limiter.take(socketId, Date.now())) return null;
    if (!this.limitedSockets.has(socketId)) {
      this.limitedSockets.add(socketId);
      this.logger.debug(`Socket ${socketId} hit the call event rate cap`);
    }
    return { ok: false, reason: "rate_limited" };
  }

  list(userId: string) {
    return { ok: true as const, calls: this.registry.listForMember(userId).map(presentCall) };
  }

  async start(userId: string, socketId: string, conversationId: string): Promise<CallAck> {
    // Team rooms talk in their voice channel; ringing the whole team is not a thing.
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId }, select: { teamId: true, channelId: true } });
    if (!conversation || conversation.teamId || conversation.channelId) return { ok: false, reason: "not_member" };
    if (this.rooms.isInRoom(userId)) return { ok: false, reason: "busy" };
    const members = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true, user: { select: { displayName: true } } },
    });
    const memberIds = members.map((m) => m.userId);
    if (!memberIds.includes(userId)) return { ok: false, reason: "not_member" };
    const denied = await this.checkAllowed(userId, memberIds);
    if (denied) return denied;

    const names = Object.fromEntries(members.map((m) => [m.userId, m.user.displayName]));
    const id = randomUUID();
    const result = this.registry.start({ id, conversationId, userId, socketId, memberIds, names, now: Date.now() });
    if (!result.ok) return result;

    this.ringTimers.set(id, setTimeout(() => this.apply(this.registry.expireRinging(id)), RING_TIMEOUT_MS));
    const call = presentCall(result.call);
    for (const ringingId of result.call.ringing) this.realtime.emitToUser(ringingId, "call:ringing", { call });
    this.broadcast(result.call);
    return { ok: true, call };
  }

  async join(userId: string, socketId: string, callId: string): Promise<CallAck> {
    const existing = this.registry.get(callId);
    if (!existing) return { ok: false, reason: "no_call" };
    const membership = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: existing.conversationId, userId } },
      select: { id: true },
    });
    if (!membership) return { ok: false, reason: "not_member" };
    if (this.rooms.isInRoom(userId)) return { ok: false, reason: "busy" };
    const denied = await this.checkAllowed(userId, existing.memberIds);
    if (denied) return denied;

    const result = this.registry.join(callId, userId, socketId, Date.now());
    if (!result.ok) return result;
    this.apply(result);
    return { ok: true, call: presentCall(result.call) };
  }

  decline(userId: string, callId: string): CallAck {
    return this.toAck(this.apply(this.registry.decline(callId, userId)));
  }

  leave(userId: string, callId: string): CallAck {
    return this.toAck(this.apply(this.registry.leave(callId, userId)));
  }

  mute(userId: string, socketId: string, callId: string, muted: boolean): CallAck {
    return this.toAck(this.apply(this.registry.setMuted(callId, userId, socketId, muted)));
  }

  disconnect(socketId: string) {
    this.limiter.forget(socketId);
    this.limitedSockets.delete(socketId);
    const result = this.registry.leaveBySocket(socketId);
    if (result) this.apply(result);
    const left = this.rooms.leaveBySocket(socketId);
    if (left?.ok) this.broadcastRoom(left.room.teamId);
  }

  /** Called when `blockerId` blocks `blockedId`: the blocked user leaves (or stops ringing in) every shared call. */
  endCallsBetween(blockerId: string, blockedId: string) {
    for (const result of this.registry.separate(blockerId, blockedId)) this.apply(result);
    for (const result of this.rooms.separate(blockerId, blockedId)) {
      if (result.ok) this.broadcastRoom(result.room.teamId);
    }
  }

  /** Relays to the target's call socket only. Silently drops anything outside a shared call. */
  signal(userId: string, socketId: string, payload: SignalPayload): CallAck {
    const target = this.registry.relayTarget(payload.callId, userId, socketId, payload.to);
    if (!target) return { ok: false, reason: "no_call" };
    this.realtime.emitToSocket(target, "call:signal", { callId: payload.callId, from: userId, data: payload.data });
    return { ok: true };
  }

  // Voice rooms: team rooms and community voice channels.

  /** People in these rooms right now. */
  occupancy(roomIds: string[]) {
    return roomIds.reduce((sum, id) => sum + (this.rooms.get(id)?.occupants.size ?? 0), 0);
  }

  /** Non-empty rooms the viewer may join. The viewer also starts hearing about them (joined after the room filled up). */
  async roomSync(userId: string) {
    const [memberships, channels] = await Promise.all([
      this.prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } }),
      this.prisma.communityChannel.findMany({ where: { kind: "VOICE", community: { members: { some: { userId } } } }, select: { id: true } }),
    ]);
    const rooms = [...memberships.map(({ teamId }) => teamId), ...channels.map(({ id }) => id)]
      .map((roomId) => presentRoom(roomId, this.rooms.get(roomId)))
      .filter((room) => room.participants.length > 0);
    for (const { teamId } of rooms) {
      const audience = this.roomAudience.get(teamId) ?? [];
      if (!audience.includes(userId)) this.roomAudience.set(teamId, [...audience, userId]);
    }
    return { ok: true as const, rooms };
  }

  async roomJoin(userId: string, socketId: string, teamId: string): Promise<RoomAck> {
    const members = await this.roomRoster(teamId);
    const self = members.find((member) => member.userId === userId);
    if (!self) return { ok: false, reason: "not_member" };
    if (this.registry.isInCall(userId)) return { ok: false, reason: "busy" };
    // Blocks only matter against who is in the room right now, not the whole roster.
    const denied = await this.checkAllowed(userId, [...(this.rooms.get(teamId)?.occupants.keys() ?? [])]);
    if (denied) return denied;

    const result = this.rooms.join({ teamId, userId, displayName: self.user.displayName, socketId, now: Date.now() });
    if (!result.ok) return result;
    this.roomAudience.set(teamId, members.map((member) => member.userId));
    return { ok: true, room: this.broadcastRoom(teamId) };
  }

  roomLeave(userId: string, teamId: string): RoomAck {
    return this.toRoomAck(this.rooms.leave(teamId, userId));
  }

  roomVoice(userId: string, socketId: string, teamId: string, muted: boolean, deafened: boolean): RoomAck {
    return this.toRoomAck(this.rooms.setVoice(teamId, userId, socketId, muted, deafened));
  }

  roomSignal(userId: string, socketId: string, payload: RoomSignalPayload): RoomAck {
    const target = this.rooms.relayTarget(payload.teamId, userId, socketId, payload.to);
    if (!target) return { ok: false, reason: "no_room" };
    this.realtime.emitToSocket(target, "room:signal", { teamId: payload.teamId, from: userId, data: payload.data });
    return { ok: true };
  }

  /** Who may join a room: the team roster, or the members of the voice channel's community. */
  private async roomRoster(roomId: string) {
    const select = { userId: true, user: { select: { displayName: true } } } as const;
    const team = await this.prisma.teamMember.findMany({ where: { teamId: roomId }, select });
    if (team.length > 0) return team;
    return this.prisma.communityMember.findMany({ where: { community: { channels: { some: { id: roomId, kind: "VOICE" } } } }, select });
  }

  /** Left or was removed from the team or community: out of its room, and no longer told about it. */
  removeFromRoom(teamId: string, userId: string) {
    const result = this.rooms.leave(teamId, userId);
    if (result.ok) this.broadcastRoom(teamId);
    const audience = this.roomAudience.get(teamId);
    if (audience) this.roomAudience.set(teamId, audience.filter((id) => id !== userId));
  }

  /** Team, community or voice channel deleted: everyone is out. */
  closeRoom(teamId: string) {
    this.rooms.close(teamId);
    this.broadcastRoom(teamId);
  }

  /** Sends the room's state to the team and returns it. Forgets the audience once the room is empty. */
  private broadcastRoom(teamId: string) {
    const room = presentRoom(teamId, this.rooms.get(teamId));
    for (const memberId of this.roomAudience.get(teamId) ?? []) this.realtime.emitToUser(memberId, "room:state", { room });
    if (room.participants.length === 0) this.roomAudience.delete(teamId);
    return room;
  }

  private toRoomAck(result: RoomResult): RoomAck {
    if (!result.ok) return result;
    this.broadcastRoom(result.room.teamId);
    return { ok: true };
  }

  /** Same gates as messaging: not restricted, and no Block with any other conversation member. */
  private async checkAllowed(userId: string, memberIds: string[]): Promise<Denied | null> {
    try {
      await assertCanInteract(this.prisma, userId);
    } catch {
      return { ok: false, reason: "restricted" };
    }
    const others = memberIds.filter((id) => id !== userId);
    if (await hasBlockWith(this.prisma, userId, others)) return { ok: false, reason: "blocked" };
    return null;
  }

  /** Emits the outcome of a registry change: state to every member, or `call:ended`. */
  private apply(result: CallResult): CallResult {
    if (!result.ok) return result;
    const { call, ended } = result;
    if (ended) {
      this.clearTimer(call.id);
      const payload = { callId: call.id, conversationId: call.conversationId, reason: ended };
      for (const memberId of call.memberIds) this.realtime.emitToUser(memberId, "call:ended", payload);
      return result;
    }
    if (call.ringing.size === 0) this.clearTimer(call.id);
    this.broadcast(call);
    return result;
  }

  private broadcast(call: Call) {
    const payload = { call: presentCall(call) };
    for (const memberId of call.memberIds) this.realtime.emitToUser(memberId, "call:state", payload);
  }

  private clearTimer(callId: string) {
    const timer = this.ringTimers.get(callId);
    if (timer) clearTimeout(timer);
    this.ringTimers.delete(callId);
  }

  private toAck(result: CallResult): CallAck {
    return result.ok ? { ok: true } : { ok: false, reason: result.reason };
  }
}

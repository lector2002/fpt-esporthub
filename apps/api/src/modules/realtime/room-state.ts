/**
 * In-memory team voice rooms (Discord-style voice channels). Pure (no Nest, no DB) so the rules can be unit tested.
 * Unlike calls nobody rings: members join and leave freely, one person may sit alone, and the room
 * disappears once empty. Nothing here survives an API restart.
 */

import { MAX_CALL_SIZE } from "./call-state";

/** Same mesh limit as calls: every occupant streams to every other one. */
export const MAX_ROOM_SIZE = MAX_CALL_SIZE;

export type RoomFailure = "busy" | "full" | "no_room";

interface Occupant {
  userId: string;
  displayName: string;
  socketId: string;
  joinedAt: number;
  muted: boolean;
  deafened: boolean;
}

export interface Room {
  teamId: string;
  occupants: Map<string, Occupant>;
}

export type RoomResult = { ok: true; room: Room } | { ok: false; reason: RoomFailure };

export interface JoinInput {
  teamId: string;
  userId: string;
  displayName: string;
  socketId: string;
  now: number;
}

export class RoomRegistry {
  private rooms = new Map<string, Room>();
  private byUser = new Map<string, string>();

  get(teamId: string) {
    return this.rooms.get(teamId) ?? null;
  }

  isInRoom(userId: string) {
    return this.byUser.has(userId);
  }

  join(input: JoinInput): RoomResult {
    const { teamId, userId } = input;
    if (this.byUser.has(userId)) return { ok: false, reason: "busy" };
    const room = this.rooms.get(teamId) ?? { teamId, occupants: new Map<string, Occupant>() };
    if (room.occupants.size >= MAX_ROOM_SIZE) return { ok: false, reason: "full" };
    room.occupants.set(userId, {
      userId,
      displayName: input.displayName,
      socketId: input.socketId,
      joinedAt: input.now,
      muted: false,
      deafened: false,
    });
    this.rooms.set(teamId, room);
    this.byUser.set(userId, teamId);
    return { ok: true, room };
  }

  leave(teamId: string, userId: string): RoomResult {
    const room = this.rooms.get(teamId);
    if (!room || !room.occupants.delete(userId)) return { ok: false, reason: "no_room" };
    this.byUser.delete(userId);
    if (room.occupants.size === 0) this.rooms.delete(teamId);
    return { ok: true, room };
  }

  /** Disconnect cleanup: leaves whatever room this socket had joined. */
  leaveBySocket(socketId: string): RoomResult | null {
    for (const room of this.rooms.values()) {
      for (const occupant of room.occupants.values()) {
        if (occupant.socketId === socketId) return this.leave(room.teamId, occupant.userId);
      }
    }
    return null;
  }

  /** Voice state, only from the occupant's own room socket. Deafened implies muted. */
  setVoice(teamId: string, userId: string, socketId: string, muted: boolean, deafened: boolean): RoomResult {
    const occupant = this.rooms.get(teamId)?.occupants.get(userId);
    if (!occupant || occupant.socketId !== socketId) return { ok: false, reason: "no_room" };
    occupant.muted = muted || deafened;
    occupant.deafened = deafened;
    return { ok: true, room: this.rooms.get(teamId)! };
  }

  /** A new Block: the blocked user leaves every room the blocker is in. */
  separate(blockerId: string, blockedId: string): RoomResult[] {
    const teamId = this.byUser.get(blockerId);
    if (!teamId || this.byUser.get(blockedId) !== teamId) return [];
    return [this.leave(teamId, blockedId)];
  }

  /** The team is gone: everyone leaves. Returns the ids that were inside. */
  close(teamId: string): string[] {
    const room = this.rooms.get(teamId);
    if (!room) return [];
    const ids = [...room.occupants.keys()];
    for (const id of ids) this.byUser.delete(id);
    this.rooms.delete(teamId);
    return ids;
  }

  /** Target socket for a signal, or null unless both users are in the same room and the sender uses its room socket. */
  relayTarget(teamId: string, fromUserId: string, fromSocketId: string, toUserId: string) {
    const room = this.rooms.get(teamId);
    if (!room || fromUserId === toUserId) return null;
    const sender = room.occupants.get(fromUserId);
    const target = room.occupants.get(toUserId);
    if (!sender || !target || sender.socketId !== fromSocketId) return null;
    return target.socketId;
  }
}

/** Wire shape sent to clients. An empty room is sent as no participants. */
export function presentRoom(teamId: string, room: Room | null) {
  return {
    teamId,
    participants: [...(room?.occupants.values() ?? [])].map((o) => ({
      userId: o.userId,
      displayName: o.displayName,
      joinedAt: new Date(o.joinedAt).toISOString(),
      muted: o.muted,
      deafened: o.deafened,
    })),
    maxParticipants: MAX_ROOM_SIZE,
  };
}

export type PresentedRoom = ReturnType<typeof presentRoom>;

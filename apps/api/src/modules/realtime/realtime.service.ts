import { Injectable } from "@nestjs/common";
import type { Namespace } from "socket.io";

export const userRoom = (userId: string) => `user:${userId}`;
export const conversationRoom = (conversationId: string) => `conversation:${conversationId}`;

/** Server-side emitter for the `/realtime` Socket.IO namespace. Safe to call before the gateway is ready. */
@Injectable()
export class RealtimeService {
  private server: Namespace | null = null;

  setServer(server: Namespace) {
    this.server = server;
  }

  /** Has at least one connected socket. Single-instance adapter, like the rest of realtime. */
  isOnline(userId: string) {
    return Boolean(this.server?.adapter.rooms.get(userRoom(userId))?.size);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.emitToRooms([userRoom(userId)], event, payload);
  }

  emitToConversation(conversationId: string, event: string, payload: unknown) {
    this.emitToRooms([conversationRoom(conversationId)], event, payload);
  }

  /** One socket only (e.g. WebRTC signaling, where other tabs of the same user must not receive it). */
  emitToSocket(socketId: string, event: string, payload: unknown) {
    this.emitToRooms([socketId], event, payload);
  }

  /** One emit across several rooms; Socket.IO delivers once per socket even if it is in more than one. */
  emitToRooms(rooms: string[], event: string, payload: unknown) {
    if (!this.server || rooms.length === 0) return;
    this.server.to(rooms).emit(event, payload);
  }
}

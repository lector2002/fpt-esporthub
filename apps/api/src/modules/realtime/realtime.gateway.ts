import "../../env";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { SkipThrottle } from "@nestjs/throttler";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Namespace, Socket } from "socket.io";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeService, conversationRoom, userRoom } from "./realtime.service";
import { CallService } from "./call.service";
import { readField, readMute, readRoomSignal, readRoomVoice, readSignal } from "./call-payloads";

type AuthedSocket = Socket & { data: { userId?: string } };

@SkipThrottle()
@WebSocketGateway({
  namespace: "/realtime",
  cors: { origin: process.env.WEB_ORIGIN ?? "http://localhost:3000", credentials: true },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Namespace;

  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
    private realtime: RealtimeService,
    private calls: CallService,
  ) {}

  afterInit(server: Namespace) {
    this.realtime.setServer(server);
    server.use((socket, next) => {
      void this.authenticate(socket).then((userId) => {
        if (!userId) return next(new Error("unauthorized"));
        (socket as AuthedSocket).data.userId = userId;
        next();
      });
    });
  }

  async handleConnection(socket: AuthedSocket) {
    const userId = socket.data.userId;
    if (!userId) {
      socket.disconnect(true);
      return;
    }
    await socket.join(userRoom(userId));
  }

  handleDisconnect(socket: AuthedSocket) {
    this.calls.disconnect(socket.id);
  }

  @SubscribeMessage("conversation:join")
  async joinConversation(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: unknown) {
    const conversationId = readConversationId(body);
    const userId = socket.data.userId;
    if (!conversationId || !userId) return { ok: false };
    const membership = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      select: { id: true },
    });
    if (!membership) return { ok: false };
    await socket.join(conversationRoom(conversationId));
    return { ok: true };
  }

  @SubscribeMessage("conversation:leave")
  async leaveConversation(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: unknown) {
    const conversationId = readConversationId(body);
    if (conversationId) await socket.leave(conversationRoom(conversationId));
    return { ok: true };
  }

  // Voice calls: signaling only; audio flows peer to peer. Rules live in CallService.

  @SubscribeMessage("call:sync")
  syncCalls(@ConnectedSocket() socket: AuthedSocket) {
    const limited = this.calls.throttle(socket.id);
    if (limited) return limited;
    const userId = socket.data.userId;
    return userId ? this.calls.list(userId) : { ok: false, reason: "invalid" };
  }

  @SubscribeMessage("call:start")
  startCall(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: unknown) {
    const limited = this.calls.throttle(socket.id);
    if (limited) return limited;
    const conversationId = readField(body, "conversationId");
    const userId = socket.data.userId;
    if (!conversationId || !userId) return { ok: false, reason: "invalid" };
    return this.calls.start(userId, socket.id, conversationId);
  }

  @SubscribeMessage("call:join")
  joinCall(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: unknown) {
    const limited = this.calls.throttle(socket.id);
    if (limited) return limited;
    const callId = readField(body, "callId");
    const userId = socket.data.userId;
    if (!callId || !userId) return { ok: false, reason: "invalid" };
    return this.calls.join(userId, socket.id, callId);
  }

  @SubscribeMessage("call:decline")
  declineCall(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: unknown) {
    const limited = this.calls.throttle(socket.id);
    if (limited) return limited;
    const callId = readField(body, "callId");
    const userId = socket.data.userId;
    if (!callId || !userId) return { ok: false, reason: "invalid" };
    return this.calls.decline(userId, callId);
  }

  @SubscribeMessage("call:leave")
  leaveCall(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: unknown) {
    const limited = this.calls.throttle(socket.id);
    if (limited) return limited;
    const callId = readField(body, "callId");
    const userId = socket.data.userId;
    if (!callId || !userId) return { ok: false, reason: "invalid" };
    return this.calls.leave(userId, callId);
  }

  @SubscribeMessage("call:mute")
  muteCall(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: unknown) {
    const limited = this.calls.throttle(socket.id);
    if (limited) return limited;
    const payload = readMute(body);
    const userId = socket.data.userId;
    if (!payload || !userId) return { ok: false, reason: "invalid" };
    return this.calls.mute(userId, socket.id, payload.callId, payload.muted);
  }

  @SubscribeMessage("call:signal")
  relaySignal(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: unknown) {
    const limited = this.calls.throttle(socket.id);
    if (limited) return limited;
    const payload = readSignal(body);
    const userId = socket.data.userId;
    if (!payload || !userId) return { ok: false, reason: "invalid" };
    return this.calls.signal(userId, socket.id, payload);
  }

  // Team voice rooms: same signaling, no ringing. Rules live in CallService.

  @SubscribeMessage("room:sync")
  syncRooms(@ConnectedSocket() socket: AuthedSocket) {
    const limited = this.calls.throttle(socket.id);
    if (limited) return limited;
    const userId = socket.data.userId;
    return userId ? this.calls.roomSync(userId) : { ok: false, reason: "invalid" };
  }

  @SubscribeMessage("room:join")
  joinRoom(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: unknown) {
    const limited = this.calls.throttle(socket.id);
    if (limited) return limited;
    const teamId = readField(body, "teamId");
    const userId = socket.data.userId;
    if (!teamId || !userId) return { ok: false, reason: "invalid" };
    return this.calls.roomJoin(userId, socket.id, teamId);
  }

  @SubscribeMessage("room:leave")
  leaveRoom(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: unknown) {
    const limited = this.calls.throttle(socket.id);
    if (limited) return limited;
    const teamId = readField(body, "teamId");
    const userId = socket.data.userId;
    if (!teamId || !userId) return { ok: false, reason: "invalid" };
    return this.calls.roomLeave(userId, teamId);
  }

  @SubscribeMessage("room:voice")
  roomVoice(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: unknown) {
    const limited = this.calls.throttle(socket.id);
    if (limited) return limited;
    const payload = readRoomVoice(body);
    const userId = socket.data.userId;
    if (!payload || !userId) return { ok: false, reason: "invalid" };
    return this.calls.roomVoice(userId, socket.id, payload.teamId, payload.muted, payload.deafened);
  }

  @SubscribeMessage("room:signal")
  relayRoomSignal(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: unknown) {
    const limited = this.calls.throttle(socket.id);
    if (limited) return limited;
    const payload = readRoomSignal(body);
    const userId = socket.data.userId;
    if (!payload || !userId) return { ok: false, reason: "invalid" };
    return this.calls.roomSignal(userId, socket.id, payload);
  }

  /** Same rule as the REST JwtStrategy: a valid token for an existing, non-banned user. */
  private async authenticate(socket: Socket): Promise<string | null> {
    const token: unknown = socket.handshake.auth?.token;
    if (typeof token !== "string" || !token) return null;
    try {
      const payload = this.jwt.verify<{ sub?: string }>(token);
      if (typeof payload.sub !== "string") return null;
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { status: true } });
      return user && user.status !== "BANNED" ? payload.sub : null;
    } catch {
      this.logger.debug("Rejected socket with invalid token");
      return null;
    }
  }
}

function readConversationId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const value = (body as { conversationId?: unknown }).conversationId;
  return typeof value === "string" && value.length > 0 && value.length <= 64 ? value : null;
}

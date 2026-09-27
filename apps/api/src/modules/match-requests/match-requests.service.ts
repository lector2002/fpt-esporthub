import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import type { GameId } from "@fpt-esporthub/database";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeService } from "../realtime/realtime.service";
import { ReputationService } from "../reputation/reputation.service";
import { assertCanInteract } from "../../common/account";
import { parseGame } from "../../common/game";
import { CreateMatchRequestDto } from "./dto/create-match-request.dto";
import { MatchRequestRules } from "./match-requests.rules";
import {
  presentRequest,
  REQUEST_INCLUDE,
  type PresentedRequest,
  type RequestRow,
} from "./match-requests.presenter";

type RequestEvent = "request.created" | "request.accepted" | "request.declined" | "request.cancelled";

interface Target {
  receiverId: string;
  teamId: string | null;
  game: GameId;
}

@Injectable()
export class MatchRequestsService {
  private rules: MatchRequestRules;

  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeService,
    private reputation: ReputationService,
  ) {
    this.rules = new MatchRequestRules(prisma);
  }

  async create(senderId: string, dto: CreateMatchRequestDto) {
    await assertCanInteract(this.prisma, senderId);
    const target = await this.validateTarget(senderId, dto);
    const row = await this.prisma.matchRequest.create({
      data: {
        senderId,
        receiverId: target.receiverId,
        teamId: target.teamId,
        game: target.game,
        type: dto.type,
        status: "PENDING",
        message: dto.message?.trim() ?? "",
      },
      include: REQUEST_INCLUDE,
    });
    const request = presentRequest(row, senderId);
    this.notify("request.created", request, [target.receiverId]);
    return { request };
  }

  async findAll(userId: string) {
    const rows = await this.prisma.matchRequest.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
          { type: "PLAYER_TO_TEAM", team: { captainId: userId } },
        ],
      },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const presented = rows.map((row) => presentRequest(row, userId));
    return {
      incoming: presented.filter((request) => request.direction === "incoming"),
      outgoing: presented.filter((request) => request.direction === "outgoing"),
    };
  }

  async accept(requestId: string, userId: string) {
    const request = await this.loadPendingForRecipient(requestId, userId, "accept");
    const participantIds = [...new Set([request.senderId, request.receiverId, request.team?.captainId])].filter(
      (id): id is string => Boolean(id),
    );

    const row = await this.prisma.$transaction(async (tx) => {
      if (request.team && request.type === "PLAYER_TO_TEAM") {
        await this.rules.addMember(tx, request.team.id, request.team.game, request.senderId);
      }
      if (request.team && request.type === "TEAM_TO_PLAYER" && request.receiverId) {
        await this.rules.addMember(tx, request.team.id, request.team.game, request.receiverId);
      }
      if (!request.conversation) {
        await tx.conversation.create({
          data: {
            matchRequestId: requestId,
            participants: { create: participantIds.map((id) => ({ userId: id })) },
          },
        });
      }
      return tx.matchRequest.update({
        where: { id: requestId },
        data: { status: "ACCEPTED" },
        include: REQUEST_INCLUDE,
      });
    });

    const presented = presentRequest(row, userId);
    await Promise.all(participantIds.map((id) => this.reputation.recordEvent(id, "MATCH_ACCEPTED", 1)));
    this.notify("request.accepted", presented, participantIds);
    return { request: presented };
  }

  async decline(requestId: string, userId: string) {
    const request = await this.loadPendingForRecipient(requestId, userId, "decline");
    const row = await this.prisma.matchRequest.update({
      where: { id: requestId },
      data: { status: "DECLINED" },
      include: REQUEST_INCLUDE,
    });
    const presented = presentRequest(row, userId);
    this.notify("request.declined", presented, [request.senderId]);
    return { request: presented };
  }

  async cancel(requestId: string, userId: string) {
    const request = await this.prisma.matchRequest.findUnique({ where: { id: requestId }, include: REQUEST_INCLUDE });
    if (!request) throw new NotFoundException("Request not found");
    if (request.senderId !== userId) throw new ForbiddenException("Only the sender can cancel a request");
    if (request.status !== "PENDING") throw new BadRequestException("Only pending requests can be cancelled");

    const row = await this.prisma.matchRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED" },
      include: REQUEST_INCLUDE,
    });
    const presented = presentRequest(row, userId);
    this.notify("request.cancelled", presented, [this.recipientId(request)].filter((id): id is string => Boolean(id)));
    return { request: presented };
  }

  /** Validates the request and resolves who receives it. Team applications go to the captain. */
  private async validateTarget(senderId: string, dto: CreateMatchRequestDto): Promise<Target> {
    if (dto.type === "PLAYER_TO_PLAYER") {
      if (!dto.receiverId) throw new BadRequestException("receiverId is required");
      if (dto.receiverId === senderId) throw new BadRequestException("Cannot send a request to yourself");
      const profile = await this.rules.requireSenderProfile(senderId, parseGame(dto.game));
      await this.rules.requirePlayerForGame(dto.receiverId, profile.game);
      await this.rules.ensureNotBlocked(senderId, dto.receiverId);
      await this.rules.ensureNoPlayerThread(senderId, dto.receiverId);
      return { receiverId: dto.receiverId, teamId: null, game: profile.game };
    }

    if (!dto.teamId) throw new BadRequestException("teamId is required");
    const team = await this.rules.requireTeam(dto.teamId);

    if (dto.type === "PLAYER_TO_TEAM") {
      if (team.captainId === senderId) throw new BadRequestException("Cannot apply to your own team");
      if (!team.recruitmentOpen) throw new ForbiddenException("Team recruitment is closed");
      await this.rules.requireSenderProfile(senderId, team.game);
      await this.rules.ensureNotBlocked(senderId, team.captainId);
      await this.rules.ensureReachable(team.captainId);
      await this.rules.ensureNotMember(team.id, senderId);
      await this.rules.ensureTeamHasRoom(team.id, team.game);
      await this.rules.ensureNoPendingTeamRequest("PLAYER_TO_TEAM", team.id, senderId);
      return { receiverId: team.captainId, teamId: team.id, game: team.game };
    }

    if (!dto.receiverId) throw new BadRequestException("receiverId is required");
    if (team.captainId !== senderId) throw new ForbiddenException("Only the team captain can send invites");
    if (dto.receiverId === senderId) throw new BadRequestException("Cannot send a request to yourself");
    await this.rules.requirePlayerForGame(dto.receiverId, team.game);
    await this.rules.ensureNotBlocked(senderId, dto.receiverId);
    await this.rules.ensureNotMember(team.id, dto.receiverId);
    await this.rules.ensureTeamHasRoom(team.id, team.game);
    await this.rules.ensureNoPendingTeamRequest("TEAM_TO_PLAYER", team.id, dto.receiverId);
    return { receiverId: dto.receiverId, teamId: team.id, game: team.game };
  }

  /** Who may accept or decline: the captain for team applications, otherwise the receiver. */
  private recipientId(request: RequestRow) {
    return request.type === "PLAYER_TO_TEAM" ? (request.team?.captainId ?? null) : request.receiverId;
  }

  private async loadPendingForRecipient(requestId: string, userId: string, action: "accept" | "decline") {
    const request = await this.prisma.matchRequest.findUnique({ where: { id: requestId }, include: REQUEST_INCLUDE });
    if (!request) throw new NotFoundException("Request not found");
    if (this.recipientId(request) !== userId) {
      throw new ForbiddenException(`Only the recipient can ${action} this request`);
    }
    if (request.status !== "PENDING") throw new BadRequestException(`Only pending requests can be ${action === "accept" ? "accepted" : "declined"}`);
    return request;
  }

  /** Push the lifecycle event to recipients; every party's inbox badge refreshes via counts:changed. */
  private notify(event: RequestEvent, request: PresentedRequest, recipientIds: string[]) {
    for (const userId of recipientIds) this.realtime.emitToUser(userId, event, { request });
    const parties = new Set([request.sender.id, request.receiver?.id, ...recipientIds].filter((id): id is string => Boolean(id)));
    for (const userId of parties) this.realtime.emitToUser(userId, "counts:changed", {});
  }
}

import type { GameId, MatchRequestStatus, MatchRequestType } from "@fpt-esporthub/database";
import { toGameSlug } from "../../common/game";

/** Prisma include used by every request read so the presenter always has names and the conversation. */
export const REQUEST_INCLUDE = {
  sender: { select: { id: true, displayName: true, avatarKey: true } },
  receiver: { select: { id: true, displayName: true, avatarKey: true } },
  team: { select: { id: true, name: true, game: true, captainId: true, logoKey: true } },
  conversation: { select: { id: true } },
} as const;

export interface RequestRow {
  id: string;
  type: MatchRequestType;
  status: MatchRequestStatus;
  message: string;
  senderId: string;
  receiverId: string | null;
  teamId: string | null;
  game: GameId | null;
  createdAt: Date;
  updatedAt: Date;
  sender: { id: string; displayName: string; avatarKey: string | null };
  receiver: { id: string; displayName: string; avatarKey: string | null } | null;
  team: { id: string; name: string; game: GameId; captainId: string; logoKey: string | null } | null;
  conversation: { id: string } | null;
}

export type Direction = "incoming" | "outgoing";

function counterpartOf(row: RequestRow, direction: Direction) {
  const teamSide =
    (direction === "outgoing" && row.type === "PLAYER_TO_TEAM") ||
    (direction === "incoming" && row.type === "TEAM_TO_PLAYER");
  if (teamSide && row.team) return { kind: "team" as const, id: row.team.id, name: row.team.name, imageKey: row.team.logoKey };
  const player = direction === "incoming" ? row.sender : (row.receiver ?? row.sender);
  return { kind: "player" as const, id: player.id, name: player.displayName, imageKey: player.avatarKey };
}

/** Older rows without a stored game fall back to the team's game. */
export function presentRequest(row: RequestRow, viewerId: string) {
  const direction: Direction = row.senderId === viewerId ? "outgoing" : "incoming";
  const game = row.game ?? row.team?.game ?? null;
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    direction,
    message: row.message,
    game: game ? toGameSlug(game) : null,
    sender: row.sender,
    receiver: row.receiver,
    team: row.team ? { id: row.team.id, name: row.team.name } : null,
    counterpart: counterpartOf(row, direction),
    conversationId: row.conversation?.id ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export type PresentedRequest = ReturnType<typeof presentRequest>;


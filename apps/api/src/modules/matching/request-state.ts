import { PrismaService } from "../prisma/prisma.service";

export type RequestStatus = "pending_sent" | "pending_received" | "connected";

export interface RequestState {
  requestStatus: RequestStatus | null;
  requestId: string | null;
  conversationId: string | null;
}

export const NO_REQUEST: RequestState = { requestStatus: null, requestId: null, conversationId: null };

const PRIORITY: Record<RequestStatus, number> = { connected: 3, pending_received: 2, pending_sent: 1 };

interface RequestRow {
  id: string;
  senderId: string;
  receiverId: string | null;
  teamId: string | null;
  type: string;
  status: string;
  conversation: { id: string } | null;
}

function put(map: Map<string, RequestState>, key: string, status: RequestStatus, row: RequestRow) {
  const current = map.get(key)?.requestStatus;
  if (current && PRIORITY[current] >= PRIORITY[status]) return;
  map.set(key, {
    requestStatus: status,
    requestId: row.id,
    conversationId: status === "connected" ? (row.conversation?.id ?? null) : null,
  });
}

function playerState(map: Map<string, RequestState>, row: RequestRow, viewerId: string) {
  if (row.type !== "PLAYER_TO_PLAYER" || !row.receiverId) return;
  const sentByViewer = row.senderId === viewerId;
  const otherId = sentByViewer ? row.receiverId : row.senderId;
  if (row.status === "ACCEPTED") put(map, otherId, "connected", row);
  else put(map, otherId, sentByViewer ? "pending_sent" : "pending_received", row);
}

function teamState(map: Map<string, RequestState>, row: RequestRow, viewerId: string) {
  if (!row.teamId) return;
  const applied = row.type === "PLAYER_TO_TEAM" && row.senderId === viewerId;
  const invited = row.type === "TEAM_TO_PLAYER" && row.receiverId === viewerId;
  if (!applied && !invited) return;
  if (row.status === "ACCEPTED") put(map, row.teamId, "connected", row);
  else put(map, row.teamId, applied ? "pending_sent" : "pending_received", row);
}

/** The viewer's open or accepted requests, keyed by target user id (players) or team id (teams). */
export async function loadRequestStates(prisma: PrismaService, viewerId: string, target: "player" | "team") {
  const rows = await prisma.matchRequest.findMany({
    where: {
      status: { in: ["PENDING", "ACCEPTED"] },
      OR: [{ senderId: viewerId }, { receiverId: viewerId }],
    },
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      teamId: true,
      type: true,
      status: true,
      conversation: { select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const map = new Map<string, RequestState>();
  for (const row of rows) {
    if (target === "player") playerState(map, row, viewerId);
    else teamState(map, row, viewerId);
  }
  return map;
}

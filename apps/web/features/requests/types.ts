import type { GameSlug } from "@/lib/contracts";

export type MatchRequestType = "PLAYER_TO_PLAYER" | "PLAYER_TO_TEAM" | "TEAM_TO_PLAYER";
export type MatchRequestStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
export type RequestAction = "accept" | "decline" | "cancel";

interface NamedUser {
  id: string;
  displayName: string;
}

export interface MatchRequestItem {
  id: string;
  type: MatchRequestType;
  status: MatchRequestStatus;
  direction: "incoming" | "outgoing";
  message: string;
  /** Null for player requests when the pair shares both games (no game column yet). */
  game: GameSlug | null;
  sender: NamedUser;
  receiver: NamedUser | null;
  team: { id: string; name: string } | null;
  /** The other side from the viewer's point of view. */
  counterpart: { kind: "player" | "team"; id: string; name: string; imageKey: string | null };
  conversationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MatchRequestList {
  incoming: MatchRequestItem[];
  outgoing: MatchRequestItem[];
}

export interface CreateMatchRequestBody {
  type: MatchRequestType;
  receiverId?: string;
  teamId?: string;
  message?: string;
  game?: GameSlug;
}

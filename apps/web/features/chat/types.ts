import type { ReputationBadge } from "@/lib/contracts";

export type MatchRequestType = "PLAYER_TO_PLAYER" | "PLAYER_TO_TEAM" | "TEAM_TO_PLAYER";

export interface ChatParticipant {
  id: string;
  displayName: string;
  avatarKey: string | null;
  reputationBadge: ReputationBadge;
}

export interface ConversationHead {
  id: string;
  /** Null in team rooms, and when the conversation has no member besides the current user. */
  otherParticipant: ChatParticipant | null;
  /** Request thread only. */
  matchRequest: { id: string; type: MatchRequestType; teamName: string | null } | null;
  /** Team room chat only. */
  team: { id: string; name: string; logoKey: string | null; members: ChatParticipant[] } | null;
  updatedAt: string;
}

export interface ConversationSummary extends ConversationHead {
  lastMessage: { content: string; senderId: string; createdAt: string } | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  /** Client-only: optimistic message not yet confirmed by the server. */
  pending?: boolean;
}

/** Single-conversation head: adds whether another participant blocked the viewer. */
export interface ConversationDetail extends ConversationHead {
  blockedByOther: boolean;
}

export interface ConversationPage {
  conversation: ConversationDetail;
  /** Chronological (oldest first) within the page. */
  messages: ChatMessage[];
  hasMore: boolean;
}

/** Socket `message:new` payload. */
export interface MessageNewEvent {
  conversationId: string;
  message: ChatMessage;
}

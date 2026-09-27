import type { GameSlug, ReputationBadge } from "@/lib/contracts";

/** Wire shapes of `/communities` (see apps/api/src/modules/communities). */
export interface CommunitySummary {
  id: string;
  name: string;
  description: string | null;
  /** Null = open to every game. */
  game: GameSlug | null;
  iconKey: string | null;
  coverKey: string | null;
  owner: { id: string; displayName: string };
  memberCount: number;
  channelCount: number;
  /** People in its voice channels right now. */
  inVoice: number;
  viewerRole: "owner" | "member" | null;
  createdAt: string;
}

export interface CommunityChannel {
  id: string;
  name: string;
  kind: "text" | "voice";
  /** Text channels, members only: the chat conversation. */
  conversationId: string | null;
}

export interface CommunityMember {
  userId: string;
  displayName: string;
  avatarKey: string | null;
  reputationBadge: ReputationBadge;
  role: "owner" | "member";
  online: boolean;
  joinedAt: string;
}

export interface CommunityDetail extends CommunitySummary {
  channels: CommunityChannel[];
  members: CommunityMember[];
}

export interface CommunityInput {
  name: string;
  description: string;
  /** Game slug or "any". */
  game: GameSlug | "any";
}

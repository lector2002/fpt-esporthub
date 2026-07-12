import type { GameId, PlayerGoalId, CommunicationStyleId } from "@fpt-esporthub/shared";

export interface PlayerProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  gameId: GameId;
  rankLabel: string;
  roleLabel: string;
  schedule: string;
  goalIds: PlayerGoalId[];
  commStyleIds: CommunicationStyleId[];
  lookingForTeam: boolean;
  riotId: string | null;
  verificationStatus: "unverified" | "self_reported" | "verified" | "pending" | "api_failed" | "suspended";
  reputationBadge: "New" | "Verified" | "Trusted" | "Caution";
  onboardingComplete: boolean;
}

export interface TeamProfile {
  id: string;
  name: string;
  tag: string;
  description: string;
  gameId: GameId;
  captainName: string;
  memberCount: number;
  neededRoles: string[];
  rankRange: string;
  schedule: string;
  goalIds: PlayerGoalId[];
  commStyleIds: CommunicationStyleId[];
  recruitmentOpen: boolean;
  createdAt: string;
}

export interface MatchResult {
  id: string;
  type: "player" | "team";
  name: string;
  game: string;
  rank: string;
  role: string;
  schedule: string;
  score: number;
  reasons: string[];
  reputationBadge: string;
  verificationStatus: string;
  bio?: string;
  avatarEmoji?: string;
  cautionMessage?: string;
}

export interface FindMatchView {
  profile: {
    game: string;
    rank: string;
    role: string;
    schedule: string;
    updatedLabel: string;
  };
  stats: {
    totalSuggestions: number;
    averageScore: number;
    pendingSent: number;
    accepted: number;
  };
  matches: MatchResult[];
  pendingRequests: Array<{
    id: string;
    name: string;
    avatarEmoji: string;
    sentAtLabel: string;
    statusLabel: string;
  }>;
  tips: Array<{
    label: string;
    state: "done" | "pending" | "todo";
  }>;
}

export interface MatchRequest {
  id: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  type: "player_to_player" | "player_to_team" | "team_to_player";
  status: "pending" | "accepted" | "declined" | "cancelled";
  message: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  otherUserName: string;
  otherUserBadge: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface TournamentEvent {
  id: string;
  title: string;
  game: string;
  date: string;
  organizer: string;
  rules: string;
  deadline: string;
  interestedCount: number;
  description: string;
}

export interface ProfileReadinessCheck {
  label: string;
  complete: boolean;
}

export interface ProfileTeamAffiliation {
  id: string;
  name: string;
  tag: string;
  gameLabel: string;
  role: string;
  memberCount: number;
  neededRoles: string[];
}

export interface ProfileAvailabilityItem {
  label: string;
  detail: string;
  tag: string;
}

export interface ProfileView {
  displayName: string;
  email: string;
  university: string;
  avatarEmoji: string;
  gameLabel: string;
  gameTheme: "valorant" | "lol";
  rankLabel: string;
  roleLabel: string;
  riotId: string | null;
  bio: string;
  lookingForTeam: boolean;
  verificationLabel: string;
  reputationLabel: string;
  emailVerified: boolean;
  goals: string[];
  communicationStyles: string[];
  availability: ProfileAvailabilityItem[];
  readiness: {
    percent: number;
    checks: ProfileReadinessCheck[];
  };
  gameConnections: Array<{
    game: string;
    gameId: string;
    icon: string;
    status: string;
    statusLabel: string;
    description: string;
    requirement: string;
    complexity: "Low" | "Medium" | "High" | string;
  }>;
  teams: ProfileTeamAffiliation[];
}

export interface DashboardCombatProfile {
  bio: string;
  rank: string;
  role: string;
  commStyle: string;
  playStyle: string;
  goal: string;
  matchScore: number;
  pendingReqs: number;
  readiness: number;
  pills: Array<{ text: string; cls: "lol" | "val" | "goal" }>;
  radar: {
    points: string;
    coords: Array<{ cx: number; cy: number }>;
    labels: Array<{ x: number; y: number; text: string }>;
  };
  matches: Array<{
    id: string | number;
    map: string;
    score: string;
    type: string;
    time: string;
    result: "Win" | "Loss";
    sub: string;
  }>;
  dailyMatches: Array<{
    id: string | number;
    avatar: string;
    name: string;
    desc: string;
    score: number;
  }>;
  pendingComms: {
    avatar: string;
    name: string;
    msg: string;
  };
}

export interface DashboardView {
  displayName: string;
  avatarEmoji: string;
  activeGame: "lol" | "val";
  unreadMessages: number;
  profiles: {
    lol: DashboardCombatProfile;
    val: DashboardCombatProfile;
  };
}

export interface Coach {
  id: string;
  userId: string;
  displayName: string;
  game: string;
  specialties: string[];
  hourlyRate: number;
  bio: string;
  availability: string[];
  rank: string;
  reputationBadge: string;
}

export interface CoachFeedback {
  id: string;
  playerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CoachDetail {
  id: string;
  userId: string;
  displayName: string;
  game: string;
  specialties: string[];
  hourlyRate: number;
  bio: string;
  availability: string[];
  rank: string;
  reputationBadge: string;
  riotId: string | null;
  verificationStatus: string;
  totalSessions: number;
  avgRating: number;
  feedbacks: CoachFeedback[];
}

export interface CoachingRequest {
  id: string;
  coachId: string;
  coachName: string;
  playerName: string;
  proposedStartAt: string;
  durationMinutes: number;
  proposedPrice: number;
  message: string;
  status: "pending" | "countered" | "agreed" | "declined" | "cancelled";
  lastProposedById: string;
  isCoach: boolean;
}

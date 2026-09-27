import type { GameEnum, GameSlug, ReputationBadge, VerificationStatus } from "@/lib/contracts";

export type UserStatus = "ACTIVE" | "WARNED" | "RESTRICTED" | "BANNED";
export type ReportStatus = "PENDING" | "REVIEWING" | "RESOLVED" | "DISMISSED";
export type ReportAction = "none" | "warn" | "restrict" | "ban";

export const USER_STATUSES: UserStatus[] = ["ACTIVE", "WARNED", "RESTRICTED", "BANNED"];
export const REPORT_STATUSES: ReportStatus[] = ["PENDING", "REVIEWING", "RESOLVED", "DISMISSED"];
export const REPORT_ACTIONS: ReportAction[] = ["none", "warn", "restrict", "ban"];

export type TopUpStatus = "PENDING" | "PAID" | "CANCELLED";
export type SpendKind = "BOOST" | "FEATURE" | "COSMETIC" | "GUIDE" | "COACHING";
export const FINANCE_PERIODS = [7, 30, 90] as const;
export type FinancePeriod = (typeof FINANCE_PERIODS)[number];

interface FinanceUser {
  id: string;
  displayName: string;
  avatarKey: string | null;
}

export interface AdminFinance {
  days: FinancePeriod;
  since: string;
  /** VND per credit, from the server's price list. */
  creditVnd: number;
  revenue: { vnd: number; previousVnd: number; orders: number; payingUsers: number; allTimeVnd: number; allTimeOrders: number };
  orders: { paid: number; pending: number; cancelled: number };
  credits: { outstanding: number; sold: number; granted: number; removed: number; spent: Record<SpendKind, number>; coachingOwed: number };
  daily: { day: string; vnd: number; orders: number; creditsUsed: number }[];
  topBuyers: { user: FinanceUser; vnd: number; orders: number }[];
  recentTopUps: { orderCode: number; credits: number; amountVnd: number; status: TopUpStatus; provider: string; createdAt: string; paidAt: string | null; user: FinanceUser }[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminMetrics {
  usersTotal: number;
  usersNew7d: number;
  profilesByGame: Record<GameSlug, number>;
  teams: number;
  openReports: number;
  pendingRequests: number;
  messages7d: number;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  avatarKey: string | null;
  role: "USER" | "ADMIN";
  status: UserStatus;
  reputationBadge: ReputationBadge;
  createdAt: string;
  profiles: {
    game: GameSlug;
    rankTier: string;
    rankLevel: number | null;
    role: string;
    verificationStatus: VerificationStatus;
  }[];
  reputationPoints: number;
  reportsReceived: number;
  openReportsReceived: number;
  reportsFiled: number;
}

export interface AdminReport {
  id: string;
  targetType: "user" | "team" | "message";
  targetId: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  reporter: { id: string; displayName: string };
  reportedUser: { id: string; displayName: string; status: UserStatus; reputationBadge: ReputationBadge } | null;
  targetPreview: { label: string; createdAt?: string } | null;
}

export interface AdminTeam {
  id: string;
  name: string;
  game: GameSlug;
  rankMin: string;
  rankMax: string;
  recruitmentOpen: boolean;
  createdAt: string;
  captain: { id: string; displayName: string };
  memberCount: number;
}

/** Tournament events come from the public tournaments API. */
export interface TournamentEvent {
  id: string;
  title: string;
  game: GameEnum | GameSlug;
  organizer: string;
  startsAt: string;
  deadlineAt: string;
  rules: string | null;
  registrationUrl: string | null;
  format: string | null;
  prize: string | null;
  teamSize: number | null;
}

export interface TournamentInput {
  title: string;
  game: GameSlug;
  organizer: string;
  startsAt: string;
  deadlineAt: string;
  rules?: string;
  /** "" clears it on an update. */
  registrationUrl: string;
  format: string;
  prize: string;
  teamSize: number | null;
}

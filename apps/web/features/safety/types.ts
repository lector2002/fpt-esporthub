export type ReportTargetType = "user" | "team" | "message";

export const REPORT_REASONS = ["toxicity", "cheating", "harassment", "spam", "impersonation", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface BlockedUser {
  userId: string;
  displayName: string;
  blockedAt: string;
}

export interface CreateReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}

export interface MyReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: "PENDING" | "REVIEWING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  resolvedAt: string | null;
  reportedUser: { id: string; displayName: string } | null;
}

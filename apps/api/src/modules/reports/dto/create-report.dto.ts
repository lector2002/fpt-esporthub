import { IsString, IsOptional, IsIn, MaxLength } from "class-validator";

export const REPORT_TARGET_TYPES = ["user", "team", "message"] as const;
export const REPORT_REASONS = ["toxicity", "cheating", "harassment", "spam", "impersonation", "other"] as const;

export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export class CreateReportDto {
  @IsIn(REPORT_TARGET_TYPES)
  targetType!: ReportTargetType;

  @IsString()
  @MaxLength(64)
  targetId!: string;

  @IsIn(REPORT_REASONS)
  reason!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  details?: string;
}

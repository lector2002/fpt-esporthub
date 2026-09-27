import { IsIn, IsNumberString, IsOptional, IsString, MaxLength } from "class-validator";

export const USER_STATUSES = ["ACTIVE", "WARNED", "RESTRICTED", "BANNED"] as const;
export const REPORT_STATUSES = ["PENDING", "REVIEWING", "RESOLVED", "DISMISSED"] as const;

export type UserStatusValue = (typeof USER_STATUSES)[number];
export type ReportStatusValue = (typeof REPORT_STATUSES)[number];

class PageQueryDto {
  @IsOptional()
  @IsNumberString()
  page?: string;
}

export class ListUsersQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: UserStatusValue;
}

export class ListReportsQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(REPORT_STATUSES)
  status?: ReportStatusValue;
}

export class ListTeamsQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export const PAGE_SIZE = 20;

export function toPage(page?: string) {
  const value = Number.parseInt(page ?? "1", 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

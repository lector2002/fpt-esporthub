import { IsIn, IsOptional } from "class-validator";

export const REPORT_ACTIONS = ["none", "warn", "restrict", "ban"] as const;
export type ReportAction = (typeof REPORT_ACTIONS)[number];

export class UpdateReportDto {
  @IsIn(["REVIEWING", "RESOLVED", "DISMISSED"])
  status!: "REVIEWING" | "RESOLVED" | "DISMISSED";

  @IsOptional()
  @IsIn(REPORT_ACTIONS)
  action?: ReportAction;
}

import { IsIn, IsOptional, IsString } from "class-validator";

export class UpdateReportDto {
  @IsIn(["REVIEWING", "RESOLVED", "DISMISSED"])
  status!: string;

  @IsString()
  @IsOptional()
  resolution?: string;
}

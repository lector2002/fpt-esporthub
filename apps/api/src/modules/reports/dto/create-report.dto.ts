import { IsString, IsOptional, IsIn } from "class-validator";

export class CreateReportDto {
  @IsIn(["user", "team", "message"])
  targetType!: string;

  @IsString()
  targetId!: string;

  @IsString()
  reason!: string;

  @IsString()
  @IsOptional()
  description?: string;
}

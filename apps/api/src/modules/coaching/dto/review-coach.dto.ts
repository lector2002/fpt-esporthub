import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class ReviewCoachDto {
  @IsIn(["APPROVED", "REJECTED"])
  status!: "APPROVED" | "REJECTED";

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

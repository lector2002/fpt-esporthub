import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";

export class UpdateFeedbackDto {
  /** Required unless a note is sent. */
  @ValidateIf((dto: UpdateFeedbackDto) => dto.status !== undefined || dto.note === undefined)
  @IsIn(["REVIEWING", "RESOLVED", "DISMISSED"])
  status?: "REVIEWING" | "RESOLVED" | "DISMISSED";

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(1000)
  note?: string;
}

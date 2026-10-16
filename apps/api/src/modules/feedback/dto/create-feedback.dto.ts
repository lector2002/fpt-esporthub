import { Transform } from "class-transformer";
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export const FEEDBACK_KINDS = ["BUG", "IDEA", "OTHER"] as const;
export type FeedbackKindValue = (typeof FEEDBACK_KINDS)[number];

export class CreateFeedbackDto {
  @IsIn(FEEDBACK_KINDS)
  kind!: FeedbackKindValue;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  page?: string;
}

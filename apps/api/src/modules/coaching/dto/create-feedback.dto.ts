import { IsInt, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  comment!: string;
}

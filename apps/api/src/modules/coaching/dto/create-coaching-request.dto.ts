import { IsDateString, IsInt, IsString, Min } from "class-validator";

export class CreateCoachingRequestDto {
  @IsString()
  coachId!: string;

  @IsDateString()
  proposedStartAt!: string;

  @IsInt()
  @Min(30)
  durationMinutes!: number;

  @IsInt()
  @Min(0)
  proposedPrice!: number;

  @IsString()
  message!: string;
}

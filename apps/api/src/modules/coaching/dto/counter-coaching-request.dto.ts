import { IsDateString, IsDivisibleBy, IsInt, IsString, Max, MaxLength, Min } from "class-validator";

export class CounterCoachingRequestDto {
  @IsDateString()
  proposedStartAt!: string;

  @IsInt()
  @Min(30)
  @Max(240)
  @IsDivisibleBy(30)
  durationMinutes!: number;

  @IsInt()
  @Min(0)
  @Max(20_000_000)
  proposedPrice!: number;

  @IsString()
  @MaxLength(500)
  message!: string;
}

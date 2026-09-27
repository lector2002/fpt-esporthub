import { IsIn, IsInt, IsString, Length, Max, Min, NotEquals } from "class-validator";
import { TOPUP_PACKAGES } from "../credit-pricing";

export class CreateTopUpDto {
  @IsIn(TOPUP_PACKAGES)
  credits!: number;
}

export class BoostProfileDto {
  @IsString()
  @Length(1, 40)
  game!: string;
}

export class AdjustCreditsDto {
  @IsString()
  @Length(1, 64)
  userId!: string;

  @IsInt()
  @NotEquals(0)
  @Min(-100_000)
  @Max(100_000)
  amount!: number;

  @IsString()
  @Length(3, 200)
  note!: string;
}

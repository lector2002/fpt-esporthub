import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from "class-validator";

const GAME_SLUGS = ["valorant", "league_of_legends"];
const FORMATS = ["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION"] as const;
const BEST_OF = [1, 3, 5];
export const MAX_TEAMS = 64;

export class CreateOfflineTournamentDto {
  @IsString()
  @Length(3, 120)
  title!: string;

  @IsIn(GAME_SLUGS)
  game!: string;

  @IsIn(FORMATS)
  format!: (typeof FORMATS)[number];

  @IsInt()
  @Min(1)
  @Max(5)
  teamSize!: number;

  @IsInt()
  @Min(3)
  @Max(MAX_TEAMS)
  maxTeams!: number;

  @IsIn(BEST_OF)
  bestOf!: number;

  @IsIn(BEST_OF)
  finalBestOf!: number;

  /** VND. */
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  entryFee!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  prize?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  rules?: string;

  @IsDateString()
  startsAt!: string;
}

export class UpdateOfflineTournamentDto {
  @IsOptional()
  @IsString()
  @Length(3, 120)
  title?: string;

  @IsOptional()
  @IsIn(FORMATS)
  format?: (typeof FORMATS)[number];

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(MAX_TEAMS)
  maxTeams?: number;

  @IsOptional()
  @IsIn(BEST_OF)
  bestOf?: number;

  @IsOptional()
  @IsIn(BEST_OF)
  finalBestOf?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  entryFee?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  prize?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  rules?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;
}

export class TournamentStatusDto {
  @IsIn(["REGISTRATION", "CHECK_IN", "CANCELLED"])
  status!: "REGISTRATION" | "CHECK_IN" | "CANCELLED";
}

export class RegisterEntryDto {
  @IsString()
  teamId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  playerIds!: string[];
}

export class UpdateEntryDto {
  @IsOptional()
  @IsBoolean()
  paid?: boolean;

  @IsOptional()
  @IsBoolean()
  checkedIn?: boolean;
}

export class CheckInDto {
  @IsString()
  @Length(8, 32)
  code!: string;
}

export class MatchResultDto {
  @IsInt()
  @Min(0)
  @Max(3)
  scoreA!: number;

  @IsInt()
  @Min(0)
  @Max(3)
  scoreB!: number;
}

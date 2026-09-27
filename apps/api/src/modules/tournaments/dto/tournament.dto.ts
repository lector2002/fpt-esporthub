import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUrl, Length, Max, MaxLength, Min, ValidateIf } from "class-validator";

const GAME_SLUGS = ["valorant", "league_of_legends"];

export class CreateTournamentDto {
  @IsString()
  @Length(3, 120)
  title!: string;

  @IsIn(GAME_SLUGS)
  game!: string;

  @IsString()
  @Length(2, 80)
  organizer!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  deadlineAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  rules?: string;

  /** External sign-up page; only http(s) so it is safe to render as a link. */
  @IsOptional()
  @ValidateIf((_, value) => value !== "")
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  @MaxLength(500)
  registrationUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  format?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  prize?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(10)
  teamSize?: number | null;
}

export class UpdateTournamentDto {
  @IsOptional()
  @IsString()
  @Length(3, 120)
  title?: string;

  @IsOptional()
  @IsIn(GAME_SLUGS)
  game?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  organizer?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  deadlineAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  rules?: string;

  /** External sign-up page; only http(s) so it is safe to render as a link. */
  @IsOptional()
  @ValidateIf((_, value) => value !== "")
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  @MaxLength(500)
  registrationUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  format?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  prize?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(10)
  teamSize?: number | null;
}

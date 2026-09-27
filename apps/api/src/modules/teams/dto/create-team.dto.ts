import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from "class-validator";
import { PLAY_MODE_IDS } from "../../lookups/lookup-data";
import { SCHEDULE_SLOTS, TEAM_MAX_GOALS, TEAM_MAX_MEMBERS } from "../team-rules";

export class CreateTeamDto {
  @IsString()
  @Length(3, 32)
  name!: string;

  @IsString()
  game!: string;

  /** LoL only: "ranked" (default) or "aram". Valorant teams are always ranked. */
  @IsOptional()
  @IsIn(PLAY_MODE_IDS)
  mode?: string;

  /** Required for ranked teams; ignored for ARAM teams. */
  @IsOptional()
  @IsString()
  rankMin?: string;

  @IsOptional()
  @IsString()
  rankMax?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(TEAM_MAX_MEMBERS)
  @IsString({ each: true })
  neededRoles?: string[];

  @IsArray()
  @ArrayMaxSize(SCHEDULE_SLOTS.length)
  @IsIn(SCHEDULE_SLOTS, { each: true })
  schedule!: string[];

  @IsArray()
  @ArrayMaxSize(TEAM_MAX_GOALS)
  @IsString({ each: true })
  goals!: string[];

  @IsString()
  communicationStyle!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  recruitmentOpen?: boolean;
}

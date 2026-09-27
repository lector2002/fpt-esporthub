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

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @Length(3, 32)
  name?: string;

  /** LoL only: "ranked" or "aram". Ignored for Valorant. */
  @IsOptional()
  @IsIn(PLAY_MODE_IDS)
  mode?: string;

  /** Ignored for ARAM teams. */
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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(SCHEDULE_SLOTS.length)
  @IsIn(SCHEDULE_SLOTS, { each: true })
  schedule?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(TEAM_MAX_GOALS)
  @IsString({ each: true })
  goals?: string[];

  @IsOptional()
  @IsString()
  communicationStyle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  recruitmentOpen?: boolean;
}

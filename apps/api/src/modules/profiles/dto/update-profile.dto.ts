import {
  IsString,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsInt,
  IsIn,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
} from "class-validator";
import { PLAY_MODE_IDS, communicationStyles, playerGoals, scheduleSlots } from "../../lookups/lookup-data";

const ids = (list: ReadonlyArray<{ id: string }>) => list.map((item) => item.id);

export const LOOKING_STATUSES = ["open_to_match", "not_looking"] as const;

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  bio?: string;

  @IsOptional()
  @IsIn(["valorant", "league_of_legends"])
  game?: string;

  @IsOptional()
  @IsString()
  rankTier?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  rankLevel?: number | null;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsArray()
  @IsIn(ids(scheduleSlots), { each: true })
  @ArrayMaxSize(scheduleSlots.length)
  schedule?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(ids(playerGoals), { each: true })
  @ArrayMaxSize(2)
  goals?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(ids(communicationStyles), { each: true })
  @ArrayMaxSize(2)
  communicationStyles?: string[];

  /** LoL only: any of "ranked", "aram". Switching to ARAM-only stores Unranked / Fill. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(PLAY_MODE_IDS, { each: true })
  playModes?: string[];

  @IsOptional()
  @IsIn(LOOKING_STATUSES)
  lookingStatus?: string;

  /** Riot ID as `GameName#TAG`. Send null to clear it. */
  @IsOptional()
  @IsString()
  @Matches(/^[^#]{3,16}#[A-Za-z0-9]{3,5}$/, { message: "riotId must look like GameName#TAG" })
  riotId?: string | null;
}

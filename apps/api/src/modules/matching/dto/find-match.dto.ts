import { IsString, IsIn, IsOptional } from "class-validator";
import { PLAY_MODE_IDS, type PlayMode } from "../../lookups/lookup-data";

export class FindMatchDto {
  @IsString()
  @IsIn(["find_players", "find_teams"])
  mode!: "find_players" | "find_teams";

  @IsOptional()
  @IsIn(["valorant", "league_of_legends"])
  game?: string;

  /** LoL only; defaults to "ranked". Valorant always matches in ranked. */
  @IsOptional()
  @IsIn(PLAY_MODE_IDS)
  playMode?: PlayMode;
}

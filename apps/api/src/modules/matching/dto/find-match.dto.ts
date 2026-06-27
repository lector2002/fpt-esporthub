import { IsString, IsIn } from "class-validator";

export class FindMatchDto {
  @IsString()
  @IsIn(["find_players", "find_teams"])
  mode!: "find_players" | "find_teams";
}

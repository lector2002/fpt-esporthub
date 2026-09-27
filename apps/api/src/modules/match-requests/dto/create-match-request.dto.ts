import { IsString, IsOptional, IsIn, MaxLength } from "class-validator";
import { MAX_MESSAGE_LENGTH } from "../match-requests.constants";

export class CreateMatchRequestDto {
  @IsString()
  @IsIn(["PLAYER_TO_PLAYER", "PLAYER_TO_TEAM", "TEAM_TO_PLAYER"])
  type!: "PLAYER_TO_PLAYER" | "PLAYER_TO_TEAM" | "TEAM_TO_PLAYER";

  @IsOptional()
  @IsString()
  receiverId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_MESSAGE_LENGTH)
  message?: string;

  /** Game slug of the sender's active profile. Ignored for team requests, which use the team's game. */
  @IsOptional()
  @IsIn(["valorant", "league_of_legends"])
  game?: string;
}

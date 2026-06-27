import { IsString, IsOptional, IsIn, MinLength } from "class-validator";

export class CreateMatchRequestDto {
  @IsString()
  @IsIn(["PLAYER_TO_PLAYER", "PLAYER_TO_TEAM", "TEAM_TO_PLAYER"])
  type!: string;

  @IsOptional()
  @IsString()
  receiverId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsString()
  @MinLength(1)
  message!: string;
}

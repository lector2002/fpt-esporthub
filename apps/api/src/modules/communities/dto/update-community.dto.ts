import { IsIn, IsOptional, IsString, Length, MaxLength } from "class-validator";

export class UpdateCommunityDto {
  @IsOptional()
  @IsString()
  @Length(3, 40)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsIn(["valorant", "league_of_legends", "any"])
  game?: string;
}

import { IsIn, IsOptional, IsString, Length, MaxLength } from "class-validator";

export class CreateCommunityDto {
  @IsString()
  @Length(3, 40)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  /** Game slug, or "any" / omitted for a community open to every game. */
  @IsOptional()
  @IsIn(["valorant", "league_of_legends", "any"])
  game?: string;
}

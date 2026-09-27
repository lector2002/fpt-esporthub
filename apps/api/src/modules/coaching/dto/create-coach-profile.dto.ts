import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsNotEmpty, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateCoachProfileDto {
  @IsIn(["valorant", "league_of_legends"])
  game!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(40, { each: true })
  specialties!: string[];

  @IsInt()
  @Min(0)
  @Max(5_000_000)
  hourlyRate!: number;

  @IsString()
  @MinLength(20)
  @MaxLength(1000)
  bio!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(14)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(40, { each: true })
  availability!: string[];
}

import {
  IsString,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  IsInt,
  Min,
  Max,
} from "class-validator";

export class OnboardingDto {
  @IsString()
  game!: string;

  @IsString()
  rankTier!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  rankLevel?: number;

  @IsString()
  role!: string;

  @IsArray()
  @IsString({ each: true })
  schedule!: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(2)
  goals!: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(2)
  communicationStyles!: string[];

  @IsOptional()
  @IsString()
  riotId?: string;
}

import {
  IsString,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  IsInt,
  Min,
  Max,
} from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  game?: string;

  @IsOptional()
  @IsString()
  rankTier?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  rankLevel?: number;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  schedule?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(2)
  goals?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(2)
  communicationStyles?: string[];

  @IsOptional()
  @IsString()
  lookingStatus?: string;

  @IsOptional()
  @IsString()
  riotId?: string;
}

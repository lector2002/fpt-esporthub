import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
} from "class-validator";

export class CreateTeamDto {
  @IsString()
  name!: string;

  @IsString()
  game!: string;

  @IsString()
  rankMin!: string;

  @IsString()
  rankMax!: string;

  @IsArray()
  @IsString({ each: true })
  neededRoles!: string[];

  @IsArray()
  @IsString({ each: true })
  schedule!: string[];

  @IsArray()
  @IsString({ each: true })
  goals!: string[];

  @IsString()
  communicationStyle!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  recruitmentOpen?: boolean;
}

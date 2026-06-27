import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
} from "class-validator";

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  rankMin?: string;

  @IsOptional()
  @IsString()
  rankMax?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  neededRoles?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  schedule?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];

  @IsOptional()
  @IsString()
  communicationStyle?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  recruitmentOpen?: boolean;
}

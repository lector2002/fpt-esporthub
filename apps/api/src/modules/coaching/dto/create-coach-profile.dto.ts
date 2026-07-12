import { IsArray, IsInt, IsString, Min } from "class-validator";

export class CreateCoachProfileDto {
  @IsString()
  game!: string;

  @IsArray()
  @IsString({ each: true })
  specialties!: string[];

  @IsInt()
  @Min(0)
  hourlyRate!: number;

  @IsString()
  bio!: string;

  @IsArray()
  @IsString({ each: true })
  availability!: string[];
}

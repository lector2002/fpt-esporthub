import { IsString, MaxLength } from "class-validator";

export class CreateBlockDto {
  @IsString()
  @MaxLength(64)
  userId!: string;
}

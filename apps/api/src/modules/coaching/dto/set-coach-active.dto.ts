import { IsBoolean } from "class-validator";

export class SetCoachActiveDto {
  @IsBoolean()
  active!: boolean;
}

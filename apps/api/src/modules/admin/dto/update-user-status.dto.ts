import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { USER_STATUSES, type UserStatusValue } from "./admin-query.dto";

export class UpdateUserStatusDto {
  @IsIn(USER_STATUSES)
  status!: UserStatusValue;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

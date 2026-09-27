import { IsBoolean } from "class-validator";

export class UpdateRecruitmentDto {
  @IsBoolean()
  recruitmentOpen!: boolean;
}

import { IsString } from "class-validator";
import { CounterCoachingRequestDto } from "./counter-coaching-request.dto";

export class CreateCoachingRequestDto extends CounterCoachingRequestDto {
  @IsString()
  coachId!: string;
}

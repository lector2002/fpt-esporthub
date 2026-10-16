import { IsIn } from "class-validator";

export class UpdateFeedbackDto {
  @IsIn(["REVIEWING", "RESOLVED", "DISMISSED"])
  status!: "REVIEWING" | "RESOLVED" | "DISMISSED";
}

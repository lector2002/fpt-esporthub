import { IsIn, IsOptional, IsString, Length, MaxLength } from "class-validator";

export const ACHIEVEMENT_OWNERS = ["user", "team", "coach"] as const;
export type AchievementOwner = (typeof ACHIEVEMENT_OWNERS)[number];

/** Multipart fields next to the `file` part. */
export class AddAchievementDto {
  @IsIn(ACHIEVEMENT_OWNERS)
  owner!: AchievementOwner;

  /** Required when owner is "team". */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  teamId?: string;

  @IsString()
  @Length(2, 80)
  title!: string;
}

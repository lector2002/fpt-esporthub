import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsOptional, Matches } from "class-validator";
import { AGE_RANGE_IDS, CAMPUS_IDS, LOSS_REACTION_IDS, MAIN_ID_PATTERN, MAX_MAINS, VOICE_CHAT_IDS } from "../../lookups/questionnaire";

/** Every answer is optional; a missing one is stored as "not answered". */
export class QuestionnaireDto {
  @IsOptional()
  @IsIn(VOICE_CHAT_IDS)
  voiceChat?: string;

  @IsOptional()
  @IsIn(LOSS_REACTION_IDS)
  lossReaction?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_MAINS)
  @ArrayUnique()
  @Matches(MAIN_ID_PATTERN, { each: true })
  mains?: string[];

  @IsOptional()
  @IsIn(AGE_RANGE_IDS)
  ageRange?: string;

  @IsOptional()
  @IsIn(CAMPUS_IDS)
  campus?: string;
}

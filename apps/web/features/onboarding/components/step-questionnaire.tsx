"use client";

import { MainsPicker } from "@/features/questionnaire/components/mains-picker";
import { answerLabel, useQuestionnaireMessages } from "@/features/questionnaire/messages";
import { AGE_RANGE, CAMPUS, LOSS_REACTION, MAX_MAINS, VOICE_CHAT, type QuestionnaireAnswers } from "@/features/questionnaire/options";
import type { GameSlug } from "@/lib/contracts";
import { SingleChoice } from "./choice-group";
import { StepSection } from "./step-section";

type Prefix = Parameters<typeof answerLabel>[1];

/** Optional playstyle questions; every answer can be left blank or unselected again. */
export function StepQuestionnaire({
  game,
  value,
  onChange,
}: {
  game: GameSlug;
  value: QuestionnaireAnswers;
  onChange: (answers: QuestionnaireAnswers) => void;
}) {
  const { t } = useQuestionnaireMessages();
  const set = (patch: Partial<QuestionnaireAnswers>) => onChange({ ...value, ...patch });
  const choices = (prefix: Prefix, ids: readonly string[]) => ids.map((id) => ({ value: id, label: answerLabel(t, prefix, id) }));
  const single = (title: string, prefix: Prefix, ids: readonly string[], key: "voiceChat" | "lossReaction" | "ageRange" | "campus") => (
    <SingleChoice label={title} choices={choices(prefix, ids)} value={value[key] ?? ""} allowClear onChange={(next) => set({ [key]: next || null })} />
  );

  return (
    <div className="flex flex-col gap-8">
      <StepSection title={t("voiceTitle")}>{single(t("voiceTitle"), "voice", VOICE_CHAT, "voiceChat")}</StepSection>
      <StepSection title={t("lossTitle")}>{single(t("lossTitle"), "loss", LOSS_REACTION, "lossReaction")}</StepSection>
      <StepSection
        title={t(game === "league_of_legends" ? "mainsTitleLol" : "mainsTitleValorant")}
        description={t("pickUpTo", { max: MAX_MAINS })}
        aside={t("selectedCount", { count: value.mains.length, max: MAX_MAINS })}
      >
        <MainsPicker game={game} value={value.mains} onChange={(mains) => set({ mains })} />
      </StepSection>
      <StepSection title={t("campusTitle")}>{single(t("campusTitle"), "campus", CAMPUS, "campus")}</StepSection>
      <StepSection title={t("ageTitle")} description={t("agePrivate")}>
        {single(t("ageTitle"), "age", AGE_RANGE, "ageRange")}
      </StepSection>
    </div>
  );
}

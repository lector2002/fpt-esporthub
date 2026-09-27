"use client";

import { Lock } from "lucide-react";
import type { GameSlug } from "@/lib/contracts";
import { useMainOptions } from "../api";
import { answerLabel, useQuestionnaireMessages } from "../messages";
import type { QuestionnaireAnswers } from "../options";
import { MainIcon } from "./mains-picker";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/** Stored answers. Others see only answered rows and never the age range; the owner sees every question. */
export function PlaystyleSummary({ game, answers, owner }: { game: GameSlug; answers: QuestionnaireAnswers; owner: boolean }) {
  const { t } = useQuestionnaireMessages();
  const mains = useMainOptions(game);
  const none = <span className="text-muted-foreground">{t("notAnswered")}</span>;
  const show = (answered: boolean) => owner || answered;

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {show(Boolean(answers.voiceChat)) && (
        <Row label={t("voiceTitle")}>{answers.voiceChat ? answerLabel(t, "voice", answers.voiceChat) : none}</Row>
      )}
      {show(Boolean(answers.lossReaction)) && (
        <Row label={t("lossTitle")}>{answers.lossReaction ? answerLabel(t, "loss", answers.lossReaction) : none}</Row>
      )}
      {show(answers.mains.length > 0) && (
        <Row label={t(game === "league_of_legends" ? "mainsTitleLol" : "mainsTitleValorant")}>
          {answers.mains.length > 0 ? (
            <span className="flex flex-wrap gap-2">
              {answers.mains.map((id) => {
                const option = mains.data?.find((item) => item.id === id) ?? { id, label: id, imageUrl: null };
                return (
                  <span key={id} className="flex items-center gap-1.5">
                    <MainIcon option={option} /> {option.label}
                  </span>
                );
              })}
            </span>
          ) : (
            none
          )}
        </Row>
      )}
      {show(Boolean(answers.campus)) && <Row label={t("campusTitle")}>{answers.campus ? answerLabel(t, "campus", answers.campus) : none}</Row>}
      {owner && (
        <Row label={t("ageTitle")}>
          <span className="flex items-center gap-1.5">
            {answers.ageRange ? answerLabel(t, "age", answers.ageRange) : none}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="size-3" /> {t("onlyYou")}
            </span>
          </span>
        </Row>
      )}
    </dl>
  );
}

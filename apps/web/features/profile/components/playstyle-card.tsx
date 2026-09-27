"use client";

import Link from "next/link";
import { ClipboardList, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlaystyleSummary } from "@/features/questionnaire/components/playstyle-summary";
import type { GameSlug, PlayerProfile, SessionUser } from "@/lib/contracts";
import { useProfileMessages } from "../messages";

/** Questionnaire answers for the active game, with entry points to retake it or the whole onboarding. */
export function PlaystyleCard({ user, profile, game }: { user: SessionUser; profile: PlayerProfile; game: GameSlug }) {
  const { t } = useProfileMessages();
  const answered = profile.questionnaireAt !== null;
  const answers = {
    voiceChat: profile.voiceChat,
    lossReaction: profile.lossReaction,
    mains: profile.mains,
    ageRange: user.ageRange,
    campus: user.campus,
  };

  return (
    <div className="flex flex-col gap-5">
      {answered ? (
        <PlaystyleSummary game={game} answers={answers} owner />
      ) : (
        <p className="text-sm text-muted-foreground">{t("questionnairePrompt")}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant={answered ? "outline" : "default"}>
          <Link href={`/onboarding?game=${game}&step=questionnaire`}>
            <ClipboardList /> {t(answered ? "retakeQuestionnaire" : "answerQuestionnaire")}
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href={`/onboarding?game=${game}`}>
            <Pencil /> {t("redoOnboarding")}
          </Link>
        </Button>
      </div>
    </div>
  );
}

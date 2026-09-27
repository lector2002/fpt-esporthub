"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GAMES, type GameSlug } from "@/lib/contracts";
import { useOnboardingMessages } from "../messages";
import { SingleChoice } from "./choice-group";
import { StepSection } from "./step-section";
import { WizardFrame } from "./wizard-frame";

const GAME_SLUGS = Object.keys(GAMES) as GameSlug[];

export function StepGame({
  value,
  ownedGames,
  onChange,
}: {
  value: GameSlug | null;
  ownedGames: GameSlug[];
  onChange: (game: GameSlug) => void;
}) {
  const { t } = useOnboardingMessages();
  const choices = GAME_SLUGS.map((slug) => ({
    value: slug,
    label: GAMES[slug].label,
    hint: ownedGames.includes(slug) ? t("gameHasProfile") : undefined,
    disabled: ownedGames.includes(slug),
  }));

  return (
    <StepSection title={t("gameTitle")}>
      <SingleChoice
        label={t("gameTitle")}
        choices={choices}
        value={value ?? ""}
        onChange={(next) => onChange(next as GameSlug)}
        className="sm:grid-cols-2"
      />
      {ownedGames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ownedGames.map((slug) => (
            <Button key={slug} variant="outline" size="sm" asChild>
              <Link href={`/onboarding?game=${slug}`}>
                <Pencil /> {t("editGame", { game: GAMES[slug].label })}
              </Link>
            </Button>
          ))}
        </div>
      )}
    </StepSection>
  );
}

/** Every game already has a profile: pick one to edit, without wizard steps. */
export function AllGamesDone() {
  const { t } = useOnboardingMessages();
  return (
    <WizardFrame title={t("allGamesDone")} exitHref="/dashboard">
      <div className="flex flex-col gap-2 sm:flex-row">
        {GAME_SLUGS.map((slug) => (
          <Button key={slug} variant="outline" asChild>
            <Link href={`/onboarding?game=${slug}`}>
              <Pencil /> {t("editGame", { game: GAMES[slug].label })}
            </Link>
          </Button>
        ))}
      </div>
    </WizardFrame>
  );
}

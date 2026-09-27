"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/common/query-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useLinkRiot } from "@/features/riot/api";
import { GAMES, gameSlug, type GameSlug, type PlayerProfile, type SessionUser } from "@/lib/contracts";
import { useActiveGame } from "@/lib/game";
import { useSession } from "@/lib/session";
import { useRanks, useRoles, useSaveOnboarding } from "../api";
import { answersFromUser, draftFromProfile, emptyDraft, isStepComplete, stepsFor, toInput } from "../draft";
import { useOnboardingMessages } from "../messages";
import type { OnboardingDraft, OnboardingStep } from "../types";
import { WizardFrame } from "./wizard-frame";
import { AllGamesDone, StepGame } from "./step-game";
import { StepPlayMode } from "./step-play-mode";
import { StepPreferences } from "./step-preferences";
import { StepQuestionnaire } from "./step-questionnaire";
import { StepRankRole } from "./step-rank-role";
import { StepReview } from "./step-review";
import { StepRiotId } from "./step-riot-id";
import { StepRiotLink } from "./step-riot-link";

function parseGameParam(value: string | null): GameSlug | null {
  return value === "valorant" || value === "league_of_legends" ? value : null;
}

/** Session gate: sends signed-out users to login, then renders the wizard for `?game=` (or a new game), from `?step=` if given. */
export function OnboardingWizard() {
  const session = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const gameParam = parseGameParam(params.get("game"));
  const startStep = params.get("step");

  useEffect(() => {
    if (session.status !== "unauthenticated") return;
    const next = gameParam ? `/onboarding?game=${gameParam}` : "/onboarding";
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [session.status, gameParam, router]);

  if (session.status === "error") {
    return (
      <WizardFrame>
        <ErrorState error={session.error} onRetry={() => void session.refresh()} />
      </WizardFrame>
    );
  }
  if (session.status !== "authenticated") {
    return (
      <WizardFrame>
        <Skeleton className="h-96 w-full" />
      </WizardFrame>
    );
  }
  const owned = session.profiles.map((profile) => gameSlug(profile.game));
  if (!gameParam && (Object.keys(GAMES) as GameSlug[]).every((game) => owned.includes(game))) return <AllGamesDone />;
  return <Wizard key={gameParam ?? "new"} gameParam={gameParam} startStep={startStep} user={session.user} profiles={session.profiles} />;
}

function Wizard({
  gameParam,
  startStep,
  user,
  profiles,
}: {
  gameParam: GameSlug | null;
  startStep: string | null;
  user: SessionUser | null;
  profiles: PlayerProfile[];
}) {
  const { t } = useOnboardingMessages();
  const router = useRouter();
  const session = useSession();
  const { setGame } = useActiveGame();
  const save = useSaveOnboarding();
  const linkRiot = useLinkRiot();
  const queryClient = useQueryClient();

  const existing = gameParam ? profiles.find((profile) => gameSlug(profile.game) === gameParam) : undefined;
  const [draft, setDraft] = useState<OnboardingDraft>(() =>
    gameParam && existing ? draftFromProfile(gameParam, existing, user) : { ...emptyDraft(gameParam), answers: answersFromUser(user) },
  );
  // "Skip for now" puts the questionnaire back to what it was when the wizard opened.
  const [initialAnswers] = useState(draft.answers);
  const linkedRiotId =
    existing && existing.riotId && (existing.verificationStatus === "LINKED" || existing.verificationStatus === "VERIFIED") ? existing.riotId : null;
  // Steps follow the draft: LoL adds play mode and Riot linking, ARAM-only drops rank and role.
  const steps = stepsFor(draft, !gameParam);
  const [index, setIndex] = useState(() => Math.max(0, steps.indexOf(startStep as OnboardingStep)));
  const [blocked, setBlocked] = useState(false);
  const ranksQuery = useRanks(draft.game);
  const rolesQuery = useRoles(draft.game);

  const step = steps[index];
  // Typing a Riot ID without picking a result does nothing, so the link step needs a pick (or Skip).
  const linkReady = draft.riotPick !== null || (linkedRiotId !== null && draft.riotId === linkedRiotId);
  const complete = step === "link" ? linkReady : isStepComplete(step, draft, ranksQuery.data ?? []);
  const isLast = index === steps.length - 1;
  const pending = save.isPending || save.isSuccess || linkRiot.isPending;
  const patch = (next: Partial<OnboardingDraft>) => setDraft((current) => ({ ...current, ...next }));

  const submit = () => {
    const game = draft.game;
    if (!game) return;
    save.mutate(toInput({ ...draft, game }), {
      onSuccess: async () => {
        let linkedId: string | null = null;
        if (draft.riotPick && game === "league_of_legends") {
          try {
            const linked = await linkRiot.mutateAsync({ game, riotId: draft.riotPick.riotId });
            if (linked.status !== "requires_rso") linkedId = linked.riotId;
          } catch {
            toast.warning(t("linkFailed"));
          }
        }
        toast.success(linkedId ? t("savedLinked", { game: GAMES[game].label, riotId: linkedId }) : t("saved", { game: GAMES[game].label }));
        await session.refresh();
        // A profile change affects every game-scoped view (dashboard, matches...).
        await queryClient.invalidateQueries();
        setGame(game);
        router.replace("/dashboard");
      },
      onError: () => toast.error(t("saveFailed")),
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!complete) return setBlocked(true);
    setBlocked(false);
    if (isLast) return submit();
    setIndex(index + 1);
  };

  const content = {
    game: (
      <StepGame
        value={draft.game}
        ownedGames={profiles.map((profile) => gameSlug(profile.game))}
        onChange={(game) => patch({ game, playModes: ["ranked"], rankTier: "", rankLevel: null, role: "", riotPick: null })}
      />
    ),
    mode: draft.game && <StepPlayMode game={draft.game} value={draft.playModes} onChange={(playModes) => patch({ playModes })} />,
    link: <StepRiotLink draft={draft} linkedRiotId={linkedRiotId} onChange={patch} />,
    rank: <StepRankRole draft={draft} ranksQuery={ranksQuery} rolesQuery={rolesQuery} onChange={patch} />,
    preferences: <StepPreferences draft={draft} onChange={patch} />,
    riot: <StepRiotId value={draft.riotId} forceError={blocked} onChange={(riotId) => patch({ riotId })} />,
    questionnaire: draft.game && <StepQuestionnaire game={draft.game} value={draft.answers} onChange={(answers) => patch({ answers })} />,
    review: (
      <StepReview
        draft={draft}
        ranks={ranksQuery.data ?? []}
        roles={rolesQuery.data ?? []}
        linkedRiotId={linkedRiotId}
        steps={steps}
        onEdit={(target) => setIndex(steps.indexOf(target))}
      />
    ),
  }[step];

  return (
    <WizardFrame
      title={existing && gameParam ? t("titleEdit", { game: GAMES[gameParam].label }) : t("titleNew")}
      steps={steps}
      current={index}
      exitHref={existing ? "/profile/me" : "/dashboard"}
    >
      <form className="flex flex-col gap-8" onSubmit={handleSubmit} noValidate>
        {content}
        {save.isError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{t("saveFailed")}</AlertDescription>
          </Alert>
        )}
        <WizardFooter
          onBack={index > 0 ? () => setIndex(index - 1) : undefined}
          onSkip={
            step === "questionnaire"
              ? () => {
                  patch({ answers: initialAnswers });
                  setIndex(index + 1);
                }
              : step === "link" && !linkReady
                ? () => setIndex(index + 1)
                : undefined
          }
          skipLabel={t("skipForNow")}
          pending={pending}
          disabled={!complete && step !== "riot"}
          label={pending ? t("saving") : isLast ? t(existing ? "submitEdit" : "submitNew") : t("next")}
          showArrow={!isLast}
          backLabel={t("back")}
        />
      </form>
    </WizardFrame>
  );
}

function WizardFooter({
  onBack,
  onSkip,
  skipLabel,
  pending,
  disabled,
  label,
  showArrow,
  backLabel,
}: {
  onBack?: () => void;
  onSkip?: () => void;
  skipLabel: string;
  pending: boolean;
  disabled: boolean;
  label: string;
  showArrow: boolean;
  backLabel: string;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex items-center justify-between gap-3 rounded-b-xl border-t border-border bg-card p-4 sm:static sm:m-0 sm:rounded-none sm:bg-transparent sm:px-0 sm:pb-0">
      {onBack ? (
        <Button type="button" variant="ghost" onClick={onBack} disabled={pending}>
          <ArrowLeft /> {backLabel}
        </Button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        {onSkip && (
          <Button type="button" variant="ghost" onClick={onSkip} disabled={pending}>
            {skipLabel}
          </Button>
        )}
        <Button type="submit" disabled={pending || disabled}>
          {pending && <Spinner />}
          {label}
          {!pending && showArrow && <ArrowRight />}
        </Button>
      </div>
    </div>
  );
}

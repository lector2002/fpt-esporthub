"use client";

import { useState } from "react";
import { CircleCheck, Link2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RiotSearch } from "@/features/riot/components/riot-search";
import { cn } from "@/lib/utils";
import type { RiotLookup } from "@/features/riot/types";
import { rankFromLookup } from "../draft";
import { useOnboardingMessages } from "../messages";
import type { OnboardingDraft } from "../types";
import { StepSection } from "./step-section";

/** LoL: pick the Riot account from a lookup; the wizard links it after saving and the rank is filled from it. */
export function StepRiotLink({
  draft,
  linkedRiotId,
  onChange,
}: {
  draft: OnboardingDraft;
  /** Account already linked to this profile, if any. */
  linkedRiotId: string | null;
  onChange: (patch: Partial<OnboardingDraft>) => void;
}) {
  const { t } = useOnboardingMessages();
  const [searching, setSearching] = useState(false);
  const pick = (result: RiotLookup) => {
    onChange({ riotPick: result, riotId: result.riotId, ...rankFromLookup(result) });
    setSearching(false);
  };
  const current = draft.riotPick ? { riotId: draft.riotPick.riotId, iconUrl: draft.riotPick.iconUrl, picked: true } : null;
  const shown = current ?? (linkedRiotId && draft.riotId === linkedRiotId ? { riotId: linkedRiotId, iconUrl: null, picked: false } : null);

  return (
    <StepSection title={t("linkTitle")} description={t("linkHint")}>
      {shown && !searching ? (
        <div
          role="status"
          className={cn(
            "flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between",
            shown.picked ? "border-success/40 bg-success/10" : "border-border",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              {shown.iconUrl ? (
                <img src={shown.iconUrl} alt="" width={48} height={48} className="size-12 rounded-md border border-border" />
              ) : (
                <Link2 className="size-5 text-muted-foreground" />
              )}
              {shown.picked && <CircleCheck className="absolute -right-1.5 -bottom-1.5 size-5 rounded-full bg-card text-success" aria-hidden />}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{shown.riotId}</p>
              <p className="text-sm text-muted-foreground">{t(shown.picked ? "linkPicked" : "linkCurrent")}</p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => setSearching(true)} className="shrink-0">
            <RotateCw /> {t("linkChange")}
          </Button>
        </div>
      ) : (
        <RiotSearch game="league_of_legends" suggestedRiotId={draft.riotId || null} onPick={pick} />
      )}
    </StepSection>
  );
}

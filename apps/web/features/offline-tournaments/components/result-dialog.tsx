"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSubmitResult } from "../api";
import { isValidScore } from "../format";
import { useOfflineMessages } from "../messages";
import type { MatchScore, TournamentMatch } from "../types";

/** Captains report (both must agree); the host's result is final. Closed when `match` is null. */
export function ResultDialog({
  match,
  teamName,
  as,
  onClose,
}: {
  match: TournamentMatch | null;
  teamName: (entryId: string | null) => string;
  as: "captain" | "host";
  onClose: () => void;
}) {
  return (
    <Dialog open={match !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {match && <ResultForm key={match.id} match={match} teamName={teamName} as={as} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ResultForm({
  match,
  teamName,
  as,
  onClose,
}: {
  match: TournamentMatch;
  teamName: (entryId: string | null) => string;
  as: "captain" | "host";
  onClose: () => void;
}) {
  const { t } = useOfflineMessages();
  const submit = useSubmitResult();
  const [score, setScore] = useState<MatchScore>({ scoreA: 0, scoreB: 0 });
  const [touched, setTouched] = useState(false);
  const needed = Math.ceil(match.bestOf / 2);
  const valid = isValidScore(match.bestOf, score);
  const options = Array.from({ length: needed + 1 }, (_, value) => String(value));
  const reports = Object.values(match.reports ?? {});

  const save = () => {
    setTouched(true);
    if (!valid) return;
    submit.mutate(
      { matchId: match.id, as, ...score },
      {
        onSuccess: (saved) => {
          toast.success(t(as === "host" || saved.status === "DONE" ? "resultSaved" : "reportSent"));
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("resultTitle")}</DialogTitle>
        <DialogDescription>
          {t("bestOfShort", { count: match.bestOf })} · {t(as === "host" ? "hostResultHint" : "reportHint")}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        {(["A", "B"] as const).map((slot) => {
          const key = slot === "A" ? "scoreA" : "scoreB";
          const name = teamName(slot === "A" ? match.entryAId : match.entryBId);
          return (
            <div key={slot} className="flex flex-wrap items-center justify-between gap-3">
              <span id={`score-${slot}`} className="min-w-0 truncate font-medium">
                {name}
              </span>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                aria-labelledby={`score-${slot}`}
                value={String(score[key])}
                onValueChange={(value) => value && setScore((current) => ({ ...current, [key]: Number(value) }))}
              >
                {options.map((value) => (
                  <ToggleGroupItem key={value} value={value} aria-label={`${name} ${value}`} className="w-9 data-[state=on]:text-primary">
                    {value}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          );
        })}
        {touched && !valid && <FieldError>{t("scoreInvalid", { bestOf: match.bestOf, needed })}</FieldError>}
        {as === "host" && reports.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {t("reportedScores", { reports: reports.map((r) => `${r.scoreA}-${r.scoreB}`).join(" / ") })}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button onClick={save} disabled={submit.isPending}>
          {submit.isPending && <Spinner />} {t("submit")}
        </Button>
      </DialogFooter>
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleAlert, CircleCheck, QrCode } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useCheckIn } from "../api";
import { useOfflineMessages } from "../messages";

/** Opened by scanning a player's QR (`?code=`) with the host's phone camera, or used with a typed code. */
export function CheckInPage() {
  const { t } = useOfflineMessages();
  const params = useSearchParams();
  const scanned = params.get("code");
  const checkIn = useCheckIn();
  const [code, setCode] = useState("");
  const submittedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!scanned || submittedRef.current === scanned) return;
    submittedRef.current = scanned;
    checkIn.mutate(scanned);
  }, [scanned, checkIn]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = code.trim();
    if (!value) return;
    checkIn.mutate(value, { onSuccess: () => setCode("") });
  };

  const result = checkIn.data;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <PageHeader title={t("checkInTitle")} description={t("checkInHint")} />
      {checkIn.isPending && <Spinner className="size-6" />}
      {checkIn.isError && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>{checkIn.error.message}</AlertTitle>
        </Alert>
      )}
      {result && !checkIn.isPending && (
        <Alert className={result.alreadyCheckedIn ? undefined : "border-emerald-500/50"}>
          <CircleCheck className="text-emerald-400" />
          <AlertTitle>
            {t(result.alreadyCheckedIn ? "checkInAlready" : "checkInOk", { player: result.playerName, team: result.teamName })}
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-1">
            <span>{t("teamProgress", { team: result.teamName, count: result.playersCheckedIn, total: result.playersTotal })}</span>
            {result.teamCheckedIn && <span className="text-emerald-400">{t("teamReady")}</span>}
            {!result.paid && <span className="text-amber-400">{t("feeUnpaid")}</span>}
            <Link href={`/host/tournaments/${result.tournamentId}`} className="text-primary underline-offset-4 hover:underline">
              {t("openTournament")}: {result.tournamentTitle}
            </Link>
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field className="flex-1">
              <FieldLabel htmlFor="check-in-code">{t("codeLabel")}</FieldLabel>
              <Input
                id="check-in-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={32}
              />
            </Field>
            <Button type="submit" disabled={checkIn.isPending || code.trim().length < 8}>
              <QrCode /> {t("checkInSubmit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

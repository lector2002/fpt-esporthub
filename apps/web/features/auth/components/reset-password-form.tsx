"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api-client";
import { useResetPassword } from "../api";
import { useAuthMessages } from "../messages";
import { checkConfirm, checkPassword } from "../validation";
import { AuthCard, FormError, TextField, apiErrorText, issueText } from "./form-parts";
import { BackToLogin } from "./forgot-password-form";

export function ResetPasswordForm() {
  const { t } = useAuthMessages();
  const token = useSearchParams().get("token") ?? "";
  const reset = useResetPassword();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const passwordIssue = checkPassword(password);
  const confirmIssue = checkConfirm(password, confirm);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (passwordIssue || confirmIssue) return;
    reset.mutate({ token, password });
  };

  if (!token) {
    return (
      <AuthCard title={t("resetTitle")}>
        <FormError message={t("resetMissingToken")} />
        <NewLinkButton label={t("requestNewLink")} />
      </AuthCard>
    );
  }

  if (reset.isSuccess) {
    return (
      <AuthCard title={t("resetDoneTitle")}>
        <div className="flex items-start gap-3">
          <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
          <p className="text-sm text-muted-foreground">{t("resetDoneDescription")}</p>
        </div>
        <Button size="lg" asChild>
          <Link href="/login">{t("loginLink")}</Link>
        </Button>
      </AuthCard>
    );
  }

  // Password rules are checked client-side, so a 400 here means the token was rejected.
  const invalidToken = reset.error instanceof ApiError && reset.error.status === 400;

  return (
    <AuthCard title={t("resetTitle")} description={t("resetDescription")}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <TextField
          id="password"
          type="password"
          autoComplete="new-password"
          label={t("newPassword")}
          hint={t("passwordHint")}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={submitted ? issueText(t, passwordIssue) : undefined}
        />
        <TextField
          id="confirm"
          type="password"
          autoComplete="new-password"
          label={t("confirmPassword")}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          error={submitted ? issueText(t, confirmIssue) : undefined}
        />
        <FormError message={reset.isError ? apiErrorText(t, reset.error, { 400: t("resetInvalidToken") }) : undefined} />
        <Button type="submit" size="lg" disabled={reset.isPending}>
          {reset.isPending && <Spinner />}
          {reset.isPending ? t("resetPending") : t("resetSubmit")}
        </Button>
      </form>
      {invalidToken ? <NewLinkButton label={t("requestNewLink")} /> : <BackToLogin label={t("backToLogin")} />}
    </AuthCard>
  );
}

function NewLinkButton({ label }: { label: string }) {
  return (
    <Button variant="outline" asChild>
      <Link href="/forgot-password">{label}</Link>
    </Button>
  );
}

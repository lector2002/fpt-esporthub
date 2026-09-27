"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useForgotPassword } from "../api";
import { useAuthMessages } from "../messages";
import { checkEmail, normalizeEmail } from "../validation";
import { AuthCard, FormError, TextField, apiErrorText, issueText } from "./form-parts";

export function ForgotPasswordForm() {
  const { t } = useAuthMessages();
  const forgot = useForgotPassword();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const emailError = submitted ? issueText(t, checkEmail(email)) : undefined;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (checkEmail(email)) return;
    forgot.mutate(normalizeEmail(email));
  };

  if (forgot.isSuccess) {
    return (
      <AuthCard title={t("forgotSentTitle")}>
        <div className="flex items-start gap-3">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
          <p className="text-sm text-muted-foreground">{t("forgotSentDescription", { email: normalizeEmail(email) })}</p>
        </div>
        <BackToLogin label={t("backToLogin")} />
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("forgotTitle")} description={t("forgotDescription")}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <TextField
          id="email"
          type="email"
          autoComplete="email"
          label={t("email")}
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={emailError}
        />
        <FormError message={forgot.isError ? apiErrorText(t, forgot.error) : undefined} />
        <Button type="submit" size="lg" disabled={forgot.isPending}>
          {forgot.isPending && <Spinner />}
          {forgot.isPending ? t("forgotPending") : t("forgotSubmit")}
        </Button>
      </form>
      <BackToLogin label={t("backToLogin")} />
    </AuthCard>
  );
}

export function BackToLogin({ label }: { label: string }) {
  return (
    <Button variant="ghost" asChild>
      <Link href="/login">
        <ArrowLeft /> {label}
      </Link>
    </Button>
  );
}

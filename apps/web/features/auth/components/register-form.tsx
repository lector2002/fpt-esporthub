"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useRegister } from "../api";
import { useAuthMessages } from "../messages";
import { checkConfirm, checkDisplayName, checkEmail, checkPassword, normalizeEmail } from "../validation";
import { BackToLogin } from "./forgot-password-form";
import { AuthCard, FormError, TextField, apiErrorText, issueText } from "./form-parts";
import { ResendVerificationButton } from "./resend-verification";

export function RegisterForm() {
  const { t } = useAuthMessages();
  const register = useRegister();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const issues = {
    displayName: checkDisplayName(displayName),
    email: checkEmail(email),
    password: checkPassword(password),
    confirm: checkConfirm(password, confirm),
  };
  const shown = (issue: keyof typeof issues) => (submitted ? issueText(t, issues[issue]) : undefined);
  const pending = register.isPending;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.values(issues).some(Boolean)) return;
    register.mutate({ displayName: displayName.trim(), email: normalizeEmail(email), password });
  };

  if (register.isSuccess) {
    return (
      <AuthCard title={t("registerSentTitle")}>
        <div className="flex items-start gap-3">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
          <p className="text-sm text-muted-foreground">{t("registerSentDescription", { email: register.data.email })}</p>
        </div>
        <ResendVerificationButton email={register.data.email} />
        <BackToLogin label={t("backToLogin")} />
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("registerTitle")} description={t("registerDescription")}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <TextField
          id="displayName"
          autoComplete="nickname"
          maxLength={32}
          label={t("displayName")}
          hint={t("displayNameHint")}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          error={shown("displayName")}
        />
        <TextField
          id="email"
          type="email"
          autoComplete="email"
          label={t("email")}
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={shown("email")}
        />
        <TextField
          id="password"
          type="password"
          autoComplete="new-password"
          label={t("password")}
          hint={t("passwordHint")}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={shown("password")}
        />
        <TextField
          id="confirm"
          type="password"
          autoComplete="new-password"
          label={t("confirmPassword")}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          error={shown("confirm")}
        />
        <FormError message={register.isError ? apiErrorText(t, register.error, { 409: t("errorEmailTaken") }) : undefined} />
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Spinner />}
          {pending ? t("registerPending") : t("registerSubmit")}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("loginLink")}
        </Link>
      </p>
    </AuthCard>
  );
}

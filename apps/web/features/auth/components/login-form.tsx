"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { safeNextPath, useLogin } from "../api";
import { useAuthMessages } from "../messages";
import { checkEmail, normalizeEmail } from "../validation";
import { ApiError } from "@/lib/api-client";
import { AuthCard, FormError, TextField, apiErrorText, issueText } from "./form-parts";
import { ResendVerificationButton } from "./resend-verification";

export function LoginForm() {
  const { t } = useAuthMessages();
  const params = useSearchParams();
  const destination = safeNextPath(params.get("next"));
  const expired = params.get("expired") === "1";
  const login = useLogin(destination);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const emailError = submitted ? issueText(t, checkEmail(email)) : undefined;
  const passwordError = submitted && !password ? t("errorRequired") : undefined;
  const pending = login.isPending || login.isSuccess;
  const unverified = login.error instanceof ApiError && login.error.status === 403 && login.error.message === "Email not verified";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (checkEmail(email) || !password) return;
    login.mutate({ email: normalizeEmail(email), password });
  };

  return (
    <AuthCard title={t("loginTitle")} description={t("loginDescription")}>
      {expired && (
        <Alert>
          <Info />
          <AlertDescription>{t("sessionExpired")}</AlertDescription>
        </Alert>
      )}
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
        <TextField
          id="password"
          type="password"
          autoComplete="current-password"
          label={t("password")}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={passwordError}
          labelAction={
            <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary">
              {t("forgotLink")}
            </Link>
          }
        />
        <FormError message={unverified ? t("errorEmailNotVerified") : login.isError ? apiErrorText(t, login.error, { 401: t("errorInvalidCredentials") }) : undefined} />
        {unverified && <ResendVerificationButton email={normalizeEmail(email)} />}
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Spinner />}
          {pending ? t("loginPending") : t("loginSubmit")}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t("registerLink")}
        </Link>
      </p>
    </AuthCard>
  );
}

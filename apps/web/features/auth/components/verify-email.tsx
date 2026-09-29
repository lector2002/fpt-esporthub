"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api-client";
import { useVerifyEmail } from "../api";
import { useAuthMessages } from "../messages";
import { AuthCard, FormError, apiErrorText } from "./form-parts";

/** Opens the sign-up link once, then signs the user in and continues to onboarding. */
export function VerifyEmail() {
  const { t } = useAuthMessages();
  const token = useSearchParams().get("token") ?? "";
  const verify = useVerifyEmail();
  const sentRef = useRef(false);

  useEffect(() => {
    // A token works once, so a second request (Strict Mode, re-render) would fail.
    if (!token || sentRef.current) return;
    sentRef.current = true;
    verify.mutate(token);
  }, [token, verify]);

  const invalid = !token || (verify.error instanceof ApiError && verify.error.status === 400);

  if (invalid || verify.isError) {
    return (
      <AuthCard title={t("verifyTitle")}>
        <FormError message={invalid ? t("verifyInvalid") : apiErrorText(t, verify.error)} />
        <Button size="lg" asChild>
          <Link href="/login">{t("loginLink")}</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("verifyTitle")}>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner /> {t("verifyPending")}
      </p>
    </AuthCard>
  );
}

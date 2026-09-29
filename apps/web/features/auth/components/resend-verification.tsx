"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useResendVerification } from "../api";
import { useAuthMessages } from "../messages";
import { FormError, apiErrorText } from "./form-parts";

export function ResendVerificationButton({ email }: { email: string }) {
  const { t } = useAuthMessages();
  const resend = useResendVerification();

  if (resend.isSuccess) return <p className="text-sm text-muted-foreground">{t("resendDone")}</p>;

  return (
    <>
      <FormError message={resend.isError ? apiErrorText(t, resend.error) : undefined} />
      <Button type="button" variant="outline" disabled={resend.isPending} onClick={() => resend.mutate(email)}>
        {resend.isPending && <Spinner />}
        {resend.isPending ? t("resendPending") : t("resendVerification")}
      </Button>
    </>
  );
}

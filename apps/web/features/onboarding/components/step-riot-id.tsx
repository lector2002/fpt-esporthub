"use client";

import { useState } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { isRiotIdValid } from "../draft";
import { useOnboardingMessages } from "../messages";

export function StepRiotId({
  value,
  forceError,
  onChange,
}: {
  value: string;
  /** Set by the wizard after a blocked "Continue". */
  forceError: boolean;
  onChange: (riotId: string) => void;
}) {
  const { t } = useOnboardingMessages();
  const [touched, setTouched] = useState(false);
  // Show the format error once the user leaves the field, not while typing.
  const invalid = (touched || forceError) && !isRiotIdValid(value);

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor="riotId">{t("riotTitle")}</FieldLabel>
      <Input
        id="riotId"
        autoComplete="off"
        maxLength={22}
        placeholder={t("riotPlaceholder")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={invalid}
        aria-describedby="riotId-help"
      />
      {invalid ? (
        <FieldError id="riotId-help">{t("riotInvalid")}</FieldError>
      ) : (
        <FieldDescription id="riotId-help">
          {t("riotOptional")} {t("riotSelfReported")}
        </FieldDescription>
      )}
    </Field>
  );
}

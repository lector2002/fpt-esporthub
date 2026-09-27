"use client";

import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
import { useAuthMessages } from "../messages";
import type { FieldIssue } from "../validation";

type AuthT = ReturnType<typeof useAuthMessages>["t"];

const ISSUE_KEYS = {
  required: "errorRequired",
  email: "errorEmail",
  passwordShort: "errorPasswordShort",
  passwordLong: "errorPasswordLong",
  nameLength: "errorNameLength",
  mismatch: "errorMismatch",
} as const satisfies Record<FieldIssue, Parameters<AuthT>[0]>;

export function issueText(t: AuthT, issue: FieldIssue | null) {
  return issue ? t(ISSUE_KEYS[issue]) : undefined;
}

/** Maps an API failure to user copy. `overrides` handles screen-specific statuses (401, 409...). */
export function apiErrorText(t: AuthT, error: unknown, overrides: Partial<Record<number, string>> = {}) {
  if (!(error instanceof ApiError)) return t("errorGeneric");
  if (overrides[error.status]) return overrides[error.status];
  if (error.status === 0) return t("errorNetwork");
  if (error.status === 429) return t("errorTooMany");
  return t("errorGeneric");
}

export function AuthCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-5">{children}</CardContent>
    </Card>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

interface TextFieldProps extends Omit<React.ComponentProps<typeof Input>, "id"> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  labelAction?: React.ReactNode;
}

export function TextField({ id, label, error, hint, labelAction, ...inputProps }: TextFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <Field data-invalid={Boolean(error)}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {labelAction}
      </div>
      <Input id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...inputProps} />
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
    </Field>
  );
}

// Mirrors the API DTO rules in apps/api/src/modules/auth/dto.

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 32;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldIssue = "required" | "email" | "passwordShort" | "passwordLong" | "nameLength" | "mismatch";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function checkEmail(email: string): FieldIssue | null {
  const value = email.trim();
  if (!value) return "required";
  return EMAIL_PATTERN.test(value) ? null : "email";
}

export function checkPassword(password: string): FieldIssue | null {
  if (!password) return "required";
  if (password.length < PASSWORD_MIN) return "passwordShort";
  return password.length > PASSWORD_MAX ? "passwordLong" : null;
}

export function checkDisplayName(name: string): FieldIssue | null {
  const length = name.trim().length;
  if (length === 0) return "required";
  return length < DISPLAY_NAME_MIN || length > DISPLAY_NAME_MAX ? "nameLength" : null;
}

export function checkConfirm(password: string, confirm: string): FieldIssue | null {
  if (!confirm) return "required";
  return confirm === password ? null : "mismatch";
}

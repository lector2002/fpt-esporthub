import { createHmac, timingSafeEqual } from "node:crypto";

/** payOS signs a payment link over these five fields, alphabetically, as `key=value&...`. */
export function signPaymentRequest(
  checksumKey: string,
  fields: { amount: number; cancelUrl: string; description: string; orderCode: number; returnUrl: string },
) {
  const data = `amount=${fields.amount}&cancelUrl=${fields.cancelUrl}&description=${fields.description}&orderCode=${fields.orderCode}&returnUrl=${fields.returnUrl}`;
  return hmac(checksumKey, data);
}

/** Webhook `data` is signed over every key, sorted; null becomes "", arrays and objects are JSON. */
export function signWebhookData(checksumKey: string, data: Record<string, unknown>) {
  const query = Object.keys(data)
    .sort()
    .map((key) => `${key}=${stringify(data[key])}`)
    .join("&");
  return hmac(checksumKey, query);
}

export function isValidWebhookSignature(checksumKey: string, data: Record<string, unknown>, signature: unknown) {
  if (typeof signature !== "string" || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(signWebhookData(checksumKey, data), "hex");
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

function stringify(value: unknown): string {
  if (value === null || value === undefined || value === "null" || value === "undefined") return "";
  if (Array.isArray(value)) return JSON.stringify(value.map((item) => (isPlainObject(item) ? sortObject(item) : item)));
  if (isPlainObject(value)) return JSON.stringify(sortObject(value));
  return String(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sortObject(value: Record<string, unknown>) {
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, value[key]]));
}

function hmac(key: string, data: string) {
  return createHmac("sha256", key).update(data).digest("hex");
}

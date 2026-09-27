import "../../env";
import { Logger } from "@nestjs/common";
import { isValidWebhookSignature, signPaymentRequest } from "./payos-signature";

export interface CheckoutRequest {
  orderCode: number;
  amountVnd: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
}

export type ProviderStatus = "PENDING" | "PAID" | "CANCELLED";

/** A payment the provider has confirmed. Amounts are always compared to our own record before crediting. */
export interface ConfirmedPayment {
  orderCode: number;
  amountVnd: number;
}

export interface PaymentProvider {
  readonly name: "payos" | "mock";
  createCheckout(request: CheckoutRequest): Promise<{ checkoutUrl: string; paymentLinkId: string | null }>;
  /** Asks the provider directly, for the return page and missed webhooks. */
  getStatus(orderCode: number): Promise<{ status: ProviderStatus; amountVnd: number }>;
  /** Parses a webhook body; null when the signature or shape is wrong or it is not a success. */
  readWebhook(body: unknown): ConfirmedPayment | null;
}

export const PAYMENT_PROVIDER = Symbol("PAYMENT_PROVIDER");

const PAYOS_API = "https://api-merchant.payos.vn";

class PayosProvider implements PaymentProvider {
  readonly name = "payos";
  private readonly logger = new Logger("PayOS");

  constructor(private keys: { clientId: string; apiKey: string; checksumKey: string }) {}

  async createCheckout(request: CheckoutRequest) {
    const fields = {
      orderCode: request.orderCode,
      amount: request.amountVnd,
      description: request.description,
      returnUrl: request.returnUrl,
      cancelUrl: request.cancelUrl,
    };
    const data = await this.call<{ checkoutUrl: string; paymentLinkId: string }>("POST", "/v2/payment-requests", {
      ...fields,
      signature: signPaymentRequest(this.keys.checksumKey, fields),
    });
    return { checkoutUrl: data.checkoutUrl, paymentLinkId: data.paymentLinkId };
  }

  async getStatus(orderCode: number) {
    const data = await this.call<{ status: string; amount: number; amountPaid: number }>("GET", `/v2/payment-requests/${orderCode}`);
    const status: ProviderStatus = data.status === "PAID" ? "PAID" : data.status === "CANCELLED" || data.status === "EXPIRED" ? "CANCELLED" : "PENDING";
    return { status, amountVnd: status === "PAID" ? data.amountPaid : data.amount };
  }

  readWebhook(body: unknown) {
    if (typeof body !== "object" || body === null) return null;
    const { code, data, signature } = body as { code?: unknown; data?: unknown; signature?: unknown };
    if (typeof data !== "object" || data === null) return null;
    if (!isValidWebhookSignature(this.keys.checksumKey, data as Record<string, unknown>, signature)) return null;
    const payment = data as { orderCode?: unknown; amount?: unknown; code?: unknown };
    if (code !== "00" || payment.code !== "00") return null;
    if (!Number.isInteger(payment.orderCode) || !Number.isInteger(payment.amount)) return null;
    return { orderCode: payment.orderCode as number, amountVnd: payment.amount as number };
  }

  private async call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${PAYOS_API}${path}`, {
      method,
      headers: { "x-client-id": this.keys.clientId, "x-api-key": this.keys.apiKey, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await response.json().catch(() => null)) as { code?: string; desc?: string; data?: T } | null;
    if (!response.ok || json?.code !== "00" || !json.data) {
      // desc is payOS's own message; never log keys or the request body.
      this.logger.warn(`payOS ${method} ${path.split("/").slice(0, 3).join("/")} failed: ${response.status} ${json?.code ?? ""} ${json?.desc ?? ""}`);
      throw new Error("Payment provider error");
    }
    return json.data;
  }
}

/** Dev only: checkout is a page in our own web app, and its "Pay" button confirms through CreditsService.mockPay. */
class MockProvider implements PaymentProvider {
  readonly name = "mock";

  constructor(private webOrigin: string) {}

  async createCheckout(request: CheckoutRequest) {
    return { checkoutUrl: `${this.webOrigin}/wallet/checkout?order=${request.orderCode}`, paymentLinkId: null };
  }

  async getStatus() {
    return { status: "PENDING" as ProviderStatus, amountVnd: 0 };
  }

  readWebhook() {
    return null;
  }
}

/**
 * payOS when all three keys are set; the mock outside production; otherwise none (top-up turned off).
 * Half-configured keys stop the API at startup instead of failing at the first payment.
 * PAYMENT_PROVIDER=mock keeps smoke and e2e runs off the real merchant account in dev.
 */
export function createPaymentProvider(env: NodeJS.ProcessEnv = process.env): PaymentProvider | null {
  const keys = { clientId: env.PAYOS_CLIENT_ID ?? "", apiKey: env.PAYOS_API_KEY ?? "", checksumKey: env.PAYOS_CHECKSUM_KEY ?? "" };
  const set = Object.values(keys).filter(Boolean).length;
  const forceMock = env.PAYMENT_PROVIDER === "mock" && env.NODE_ENV !== "production";
  if (forceMock) return new MockProvider(env.WEB_ORIGIN ?? "http://localhost:3000");
  if (set === 3) return new PayosProvider(keys);
  if (set > 0) throw new Error("Set all of PAYOS_CLIENT_ID, PAYOS_API_KEY and PAYOS_CHECKSUM_KEY, or none");
  if (env.NODE_ENV === "production") return null;
  return new MockProvider(env.WEB_ORIGIN ?? "http://localhost:3000");
}

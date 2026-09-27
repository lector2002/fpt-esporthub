import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * Rate limits per visitor, not per proxy. Behind the Cloudflare Tunnel every request reaches the API from
 * the internal proxy, so the real client IP comes from `CF-Connecting-IP`. The header is only trusted when
 * BEHIND_CLOUDFLARE=true (the API is not reachable any other way); otherwise it could be spoofed.
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: { ip?: string; headers?: Record<string, string | string[] | undefined> }): Promise<string> {
    const header = req.headers?.["cf-connecting-ip"];
    if (process.env.BEHIND_CLOUDFLARE === "true" && typeof header === "string" && header) return header;
    return req.ip ?? "unknown";
  }
}

import { createHmac } from "node:crypto";

export const STUN_URL = "stun:stun.l.google.com:19302";
export const TURN_TTL_SECONDS = 3600;

export interface IceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

/** coturn `use-auth-secret` credentials: username `<unixExpiry>:<userId>`, credential base64(HMAC-SHA1(secret, username)). */
export function turnCredential(secret: string, userId: string, nowSeconds: number, ttlSeconds = TURN_TTL_SECONDS) {
  const username = `${nowSeconds + ttlSeconds}:${userId}`;
  const credential = createHmac("sha1", secret).update(username).digest("base64");
  return { username, credential };
}

/** STUN always; TURN only when both TURN_URLS (comma separated) and TURN_SECRET are set. */
export function buildIceServers(env: { TURN_URLS?: string; TURN_SECRET?: string }, userId: string, nowMs: number) {
  const iceServers: IceServer[] = [{ urls: [STUN_URL] }];
  const turnUrls = (env.TURN_URLS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  const secret = env.TURN_SECRET ?? "";
  if (turnUrls.length > 0 && secret) {
    iceServers.push({ urls: turnUrls, ...turnCredential(secret, userId, Math.floor(nowMs / 1000)) });
  }
  return { iceServers, ttlSeconds: TURN_TTL_SECONDS };
}

interface IceEnv {
  TURN_URLS?: string;
  TURN_SECRET?: string;
  CLOUDFLARE_TURN_KEY_ID?: string;
  CLOUDFLARE_TURN_API_TOKEN?: string;
}

const isIceServer = (value: unknown): value is IceServer =>
  typeof value === "object" && value !== null && Array.isArray((value as IceServer).urls) && (value as IceServer).urls.every((url) => typeof url === "string");

/** Short-lived STUN + TURN servers from Cloudflare Realtime, which relays through its network (no ports to open on our host). */
async function cloudflareIceServers(keyId: string, token: string, fetcher: typeof fetch) {
  const response = await fetcher(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ttl: TURN_TTL_SECONDS }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Cloudflare TURN credentials failed (${response.status})`);
  const { iceServers } = (await response.json()) as { iceServers?: unknown };
  if (!Array.isArray(iceServers) || iceServers.length === 0 || !iceServers.every(isIceServer)) throw new Error("Cloudflare TURN returned no usable ice servers");
  return iceServers;
}

/**
 * Cloudflare TURN when both its settings are set, otherwise self-hosted coturn, otherwise STUN only.
 * A Cloudflare failure falls back (and is reported) so calls can still try a direct connection.
 */
export async function resolveIceServers(env: IceEnv, userId: string, nowMs: number, fetcher: typeof fetch = fetch, onError: (message: string) => void = () => undefined) {
  if (env.CLOUDFLARE_TURN_KEY_ID && env.CLOUDFLARE_TURN_API_TOKEN) {
    try {
      return { iceServers: await cloudflareIceServers(env.CLOUDFLARE_TURN_KEY_ID, env.CLOUDFLARE_TURN_API_TOKEN, fetcher), ttlSeconds: TURN_TTL_SECONDS };
    } catch (error) {
      onError((error as Error).message);
    }
  }
  return buildIceServers(env, userId, nowMs);
}

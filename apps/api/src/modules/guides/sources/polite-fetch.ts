/** Identifies us to the sites we read, with a way to reach the operator. */
export const USER_AGENT = "FPTEsportHubBot/1.0 (+https://fptesporthub.io.vn)";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One request at a time with a gap between them, and a backoff on 429 / 5xx that honours Retry-After.
 * Returns the body, or null for a 404 (a champion or position the site doesn't have).
 */
export function createPoliteFetcher({ gapMs = 2000, retries = 2, timeoutMs = 20_000 } = {}) {
  let last = 0;
  return async function get(url: string): Promise<string | null> {
    for (let attempt = 0; ; attempt++) {
      const wait = last + gapMs - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
      let status = 0;
      let retryAfter = 0;
      try {
        const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xml" }, signal: AbortSignal.timeout(timeoutMs) });
        if (response.ok) return await response.text();
        if (response.status === 404) return null;
        status = response.status;
        retryAfter = Number(response.headers.get("retry-after")) * 1000 || 0;
      } catch {
        status = 0;
      }
      if (attempt >= retries || (status !== 0 && status !== 429 && status < 500)) throw new Error(`GET ${url} failed (${status || "network"})`);
      await sleep(Math.max(retryAfter, 30_000 * (attempt + 1)));
    }
  };
}

export type PageFetcher = ReturnType<typeof createPoliteFetcher>;

export type RateWindow = { limit: number; windowMs: number };

/** Riot personal development key limits: 20 requests / 1s and 100 requests / 2min. */
export const DEV_KEY_WINDOWS: RateWindow[] = [
  { limit: 20, windowMs: 1_000 },
  { limit: 100, windowMs: 120_000 },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Thrown when the next free slot is further away than a request should wait. */
export class RateLimitBusyError extends Error {}

/**
 * In-process sliding-window limiter. Calls are serialized through a promise chain
 * so concurrent requests cannot both claim the last free slot.
 */
export class RateLimiter {
  private timestamps: number[] = [];
  private queue: Promise<void> = Promise.resolve();
  private readonly longestWindow: number;

  constructor(
    private readonly windows: RateWindow[] = DEV_KEY_WINDOWS,
    private readonly maxWaitMs = 10_000,
  ) {
    this.longestWindow = Math.max(...windows.map((window) => window.windowMs));
  }

  acquire(): Promise<void> {
    const slot = this.queue.then(() => this.waitForSlot());
    this.queue = slot.catch(() => undefined);
    return slot;
  }

  private async waitForSlot() {
    for (;;) {
      const now = Date.now();
      this.timestamps = this.timestamps.filter((time) => now - time < this.longestWindow);
      const waitMs = this.requiredWait(now);
      if (waitMs <= 0) {
        this.timestamps.push(now);
        return;
      }
      if (waitMs > this.maxWaitMs) throw new RateLimitBusyError();
      await sleep(waitMs);
    }
  }

  private requiredWait(now: number) {
    let wait = 0;
    for (const { limit, windowMs } of this.windows) {
      const inWindow = this.timestamps.filter((time) => now - time < windowMs);
      if (inWindow.length >= limit) wait = Math.max(wait, inWindow[inWindow.length - limit] + windowMs - now);
    }
    return wait;
  }
}

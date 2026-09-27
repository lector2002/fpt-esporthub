/** Per-socket token bucket for `call:*` events. Pure and in memory, like the call registry. */

export const CALL_EVENT_BURST = 60;
export const CALL_EVENT_WINDOW_MS = 10_000;

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export class CallRateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private capacity = CALL_EVENT_BURST,
    private windowMs = CALL_EVENT_WINDOW_MS,
  ) {}

  /** Takes one token; false when the socket is over the cap. Refills `capacity` tokens per window, continuously. */
  take(key: string, now: number) {
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, updatedAt: now };
    const refill = ((now - bucket.updatedAt) / this.windowMs) * this.capacity;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + refill);
    bucket.updatedAt = now;
    this.buckets.set(key, bucket);
    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  }

  forget(key: string) {
    this.buckets.delete(key);
  }
}

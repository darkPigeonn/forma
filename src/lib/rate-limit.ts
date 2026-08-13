type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 20_000;
let lastPruneAt = 0;

function pruneExpired(now: number) {
  // Avoid scanning the map on every request under load.
  if (now - lastPruneAt < 30_000 && buckets.size < MAX_BUCKETS) return;
  lastPruneAt = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Hard cap if something floods unique keys (e.g. spoofed IPs).
  if (buckets.size > MAX_BUCKETS) {
    const overflow = buckets.size - Math.floor(MAX_BUCKETS * 0.8);
    let removed = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      removed += 1;
      if (removed >= overflow) break;
    }
  }
}

/**
 * Simple in-memory rate limiter (single Node instance / MVP).
 * Returns { ok: true } or { ok: false, retryAfterSec }.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  pruneExpired(now);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { ok: true };
}

/** Apply several limits; fail on the first that trips. */
export function rateLimitAll(
  checks: Array<{ key: string; limit: number; windowMs: number }>,
): { ok: true } | { ok: false; retryAfterSec: number } {
  let worstRetry = 1;
  for (const check of checks) {
    const result = rateLimit(check.key, check.limit, check.windowMs);
    if (!result.ok) {
      worstRetry = Math.max(worstRetry, result.retryAfterSec);
      return { ok: false, retryAfterSec: worstRetry };
    }
  }
  return { ok: true };
}

/** Public fill limits — many different respondents OK; single-IP / form flood blocked. */
export const PUBLIC_SUBMIT_LIMITS = {
  perIpPerMinute: 20,
  perFormPerMinute: 600,
  windowMs: 60_000,
} as const;

export const PUBLIC_UPLOAD_LIMITS = {
  perIpPerMinute: 30,
  perFormPerMinute: 400,
  windowMs: 60_000,
} as const;

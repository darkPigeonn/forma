import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

type RateLimitCheck = {
  key: string;
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 20_000;
let lastPruneAt = 0;

let cachedRedis: Redis | null = null;
const ratelimitByConfig = new Map<string, Ratelimit>();

function trimEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

/** True when Upstash Redis REST credentials are configured. */
export function isDistributedRateLimitConfigured(): boolean {
  return Boolean(
    trimEnv("UPSTASH_REDIS_REST_URL") && trimEnv("UPSTASH_REDIS_REST_TOKEN"),
  );
}

function getRedis(): Redis {
  if (!cachedRedis) {
    cachedRedis = Redis.fromEnv();
  }
  return cachedRedis;
}

function windowMsToDuration(windowMs: number): Duration {
  if (windowMs >= 60_000 && windowMs % 60_000 === 0) {
    return `${windowMs / 60_000} m`;
  }
  return `${Math.max(1, Math.round(windowMs / 1000))} s`;
}

function getUpstashRatelimit(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  const existing = ratelimitByConfig.get(cacheKey);
  if (existing) return existing;

  const instance = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(limit, windowMsToDuration(windowMs)),
    prefix: "forma:rl",
    analytics: false,
  });
  ratelimitByConfig.set(cacheKey, instance);
  return instance;
}

function pruneExpired(now: number) {
  if (now - lastPruneAt < 30_000 && buckets.size < MAX_BUCKETS) return;
  lastPruneAt = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
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

function rateLimitMemory(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
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

async function rateLimitUpstash(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  try {
    const ratelimit = getUpstashRatelimit(limit, windowMs);
    const result = await ratelimit.limit(key);
    if (result.success) {
      return { ok: true };
    }

    const retryAfterSec = Math.max(
      1,
      Math.ceil((result.reset - Date.now()) / 1000),
    );
    return { ok: false, retryAfterSec };
  } catch (error) {
    // Fail open so a Redis outage does not block all respondents.
    console.error("distributed rate limit failed; allowing request", error);
    return { ok: true };
  }
}

/**
 * Rate limit a single key. Uses Upstash Redis when configured, otherwise
 * in-memory (single Node instance / local dev).
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (isDistributedRateLimitConfigured()) {
    return rateLimitUpstash(key, limit, windowMs);
  }
  return rateLimitMemory(key, limit, windowMs);
}

/** Apply several limits; fail on the first that trips. */
export async function rateLimitAll(
  checks: RateLimitCheck[],
): Promise<RateLimitResult> {
  let worstRetry = 1;
  for (const check of checks) {
    const result = await rateLimit(check.key, check.limit, check.windowMs);
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

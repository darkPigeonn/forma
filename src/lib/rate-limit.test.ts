import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isDistributedRateLimitConfigured,
  rateLimit,
  rateLimitAll,
} from "@/lib/rate-limit";

describe("rate limit (in-memory fallback)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports distributed mode only when Upstash env is set", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    expect(isDistributedRateLimitConfigured()).toBe(false);

    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    expect(isDistributedRateLimitConfigured()).toBe(true);
  });

  it("allows requests up to the configured limit", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    const key = `test:allow:${Date.now()}`;
    const first = await rateLimit(key, 2, 60_000);
    const second = await rateLimit(key, 2, 60_000);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
  });

  it("blocks when the limit is exceeded", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    const key = `test:block:${Date.now()}`;
    await rateLimit(key, 1, 60_000);
    const blocked = await rateLimit(key, 1, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("fails fast in rateLimitAll when any check trips", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    const suffix = String(Date.now());
    for (let i = 0; i < 2; i++) {
      await rateLimit(`test:form:${suffix}`, 2, 60_000);
    }

    const result = await rateLimitAll([
      {
        key: `test:ip:${suffix}`,
        limit: 10,
        windowMs: 60_000,
      },
      {
        key: `test:form:${suffix}`,
        limit: 2,
        windowMs: 60_000,
      },
    ]);

    expect(result.ok).toBe(false);
  });
});

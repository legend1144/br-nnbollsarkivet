import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

type CounterEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  count: number;
  limit: number;
  retryAfterMs: number;
};

const memoryCounters = new Map<string, CounterEntry>();

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

function nowMs() {
  return Date.now();
}

function getBucket(windowMs: number) {
  return Math.floor(nowMs() / windowMs);
}

function memoryIncrement(key: string, windowMs: number): CounterEntry {
  const existing = memoryCounters.get(key);
  const now = nowMs();
  if (!existing || existing.resetAt <= now) {
    const entry = { count: 1, resetAt: now + windowMs };
    memoryCounters.set(key, entry);
    return entry;
  }
  existing.count += 1;
  return existing;
}

async function redisIncrement(key: string, windowMs: number): Promise<CounterEntry> {
  const windowKey = `rl:${key}:${getBucket(windowMs)}`;
  const count = await redis!.incr(windowKey);
  if (count === 1) {
    await redis!.pexpire(windowKey, windowMs + 1_000);
  }
  return { count, resetAt: nowMs() + windowMs };
}

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  let result: CounterEntry;

  try {
    result = redis ? await redisIncrement(key, windowMs) : memoryIncrement(key, windowMs);
  } catch {
    result = memoryIncrement(key, windowMs);
  }

  const retryAfterMs = Math.max(0, result.resetAt - nowMs());
  return {
    allowed: result.count <= limit,
    count: result.count,
    limit,
    retryAfterMs,
  };
}

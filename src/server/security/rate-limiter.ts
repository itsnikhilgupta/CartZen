interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const WINDOW_MS = (parseInt(process.env.RATE_LIMIT_WINDOW_SEC || "60", 10)) * 1000;
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10);

/**
 * Token Bucket Rate Limiter for server APIs (In-Memory / Redis compatible abstraction)
 */
export function checkRateLimit(key: string, maxTokens: number = MAX_REQUESTS, windowMs: number = WINDOW_MS): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { tokens: maxTokens, lastRefill: now };

  const elapsed = now - entry.lastRefill;
  if (elapsed > windowMs) {
    entry.tokens = maxTokens;
    entry.lastRefill = now;
  }

  if (entry.tokens > 0) {
    entry.tokens -= 1;
    rateLimitMap.set(key, entry);
    return { success: true, remaining: entry.tokens };
  } else {
    return { success: false, remaining: 0 };
  }
}

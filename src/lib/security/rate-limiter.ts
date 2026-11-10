/**
 * In-memory sliding window rate limiter for API endpoints.
 * Thread-safe for Node.js event loop with automatic stale window garbage collection.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function purgeStaleRecords(now: number) {
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    lastCleanup = now;
    for (const [key, record] of store.entries()) {
      if (now > record.resetAt) {
        store.delete(key);
      }
    }
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Check if a request identifier (e.g. IP or IP+Endpoint) exceeds rate limits.
 *
 * @param key Unique client key (IP, user ID, or combined route identifier)
 * @param limit Maximum allowed requests within the window
 * @param windowSeconds Window duration in seconds
 */
export function checkRateLimit(
  key: string,
  limit: number = 60,
  windowSeconds: number = 60
): RateLimitResult {
  const now = Date.now();
  purgeStaleRecords(now);

  const windowMs = windowSeconds * 1000;
  const existing = store.get(key);

  if (!existing || now > existing.resetAt) {
    // New or expired window
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetSeconds: windowSeconds,
    };
  }

  if (existing.count >= limit) {
    const resetSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      success: false,
      limit,
      remaining: 0,
      resetSeconds,
    };
  }

  existing.count += 1;
  const resetSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  return {
    success: true,
    limit,
    remaining: limit - existing.count,
    resetSeconds,
  };
}

/**
 * Helper to extract client IP from Next.js request headers.
 */
export function getClientIp(headers: Headers): string {
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) {
    return xRealIp.trim();
  }
  return "127.0.0.1";
}

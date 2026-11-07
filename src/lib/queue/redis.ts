import Redis, { RedisOptions } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    // Retry up to 3 times with exponential backoff, then delay 5s
    if (times > 5) {
      return null; // Stop retrying if Redis is not running
    }
    return Math.min(times * 200, 2000);
  },
};

declare global {
  var redisClient: Redis | undefined;
}

export function createRedisConnection(): Redis {
  // If running in test, during next build, or if USE_MOCK_REDIS is set
  if (
    process.env.NODE_ENV === "test" ||
    process.env.USE_MOCK_REDIS === "true" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RedisMock = require("ioredis-mock");
    return new RedisMock();
  }

  const client = new Redis(REDIS_URL, redisOptions);
  client.on("error", () => {
    // Suppress continuous unhandled error noise in environments without Redis
  });

  return client;
}

export const defaultRedis = globalThis.redisClient || createRedisConnection();

if (process.env.NODE_ENV !== "production") {
  globalThis.redisClient = defaultRedis;
}

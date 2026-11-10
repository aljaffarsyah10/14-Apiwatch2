import { defaultRedis } from "../queue/redis";

interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}

const memoryStore = new Map<string, MemoryCacheEntry>();

/**
 * Intelligent dual-layer cache manager:
 * Attempts Redis first; falls back seamlessly to high-speed in-memory TTL cache
 * if Redis is offline, disconnected, or during serverless execution.
 */
export class CacheManager {
  private static isRedisReady(): boolean {
    return defaultRedis.status === "ready" || defaultRedis.status === "connect";
  }

  static async get<T>(key: string): Promise<T | null> {
    try {
      // 1. Try Redis if connected
      if (this.isRedisReady()) {
        const val = await defaultRedis.get(key);
        if (val) {
          return JSON.parse(val) as T;
        }
      }
    } catch {
      // Fall through to memory store
    }

    // 2. Memory cache fallback
    const entry = memoryStore.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      memoryStore.delete(key);
      return null;
    }

    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return null;
    }
  }

  static async set<T>(key: string, value: T, ttlSeconds: number = 30): Promise<void> {
    const serialized = JSON.stringify(value);

    // 1. Set in memory
    memoryStore.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    // 2. Set in Redis if available
    try {
      if (this.isRedisReady()) {
        await defaultRedis.setex(key, ttlSeconds, serialized);
      }
    } catch {
      // Ignore Redis network error
    }
  }

  static async del(key: string): Promise<void> {
    memoryStore.delete(key);
    try {
      if (this.isRedisReady()) {
        await defaultRedis.del(key);
      }
    } catch {
      // Ignore Redis network error
    }
  }

  static async delPrefix(prefix: string): Promise<void> {
    // Clear memory store keys starting with prefix
    for (const key of memoryStore.keys()) {
      if (key.startsWith(prefix)) {
        memoryStore.delete(key);
      }
    }

    // Clear Redis keys with prefix
    try {
      if (this.isRedisReady()) {
        const keys = await defaultRedis.keys(`${prefix}*`);
        if (keys.length > 0) {
          await defaultRedis.del(...keys);
        }
      }
    } catch {
      // Ignore Redis network error
    }
  }
}

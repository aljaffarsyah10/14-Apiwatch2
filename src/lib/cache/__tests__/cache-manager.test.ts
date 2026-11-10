import { describe, it, expect, beforeEach } from "vitest";
import { CacheManager } from "../cache-manager";

describe("Performance Optimization: Multi-Tier CacheManager", () => {
  beforeEach(async () => {
    await CacheManager.delPrefix("test:");
  });

  it("should write and read values from cache correctly", async () => {
    const data = { count: 42, label: "healthy", timestamp: Date.now() };
    await CacheManager.set("test:metric", data, 10);

    const retrieved = await CacheManager.get<typeof data>("test:metric");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.count).toBe(42);
    expect(retrieved?.label).toBe("healthy");
  });

  it("should return null for non-existent cache keys", async () => {
    const missing = await CacheManager.get("test:does_not_exist");
    expect(missing).toBeNull();
  });

  it("should delete specific keys properly", async () => {
    await CacheManager.set("test:del_key", "value", 10);
    expect(await CacheManager.get("test:del_key")).toBe("value");

    await CacheManager.del("test:del_key");
    expect(await CacheManager.get("test:del_key")).toBeNull();
  });

  it("should delete keys by prefix pattern", async () => {
    await CacheManager.set("test:prefix:a", "A", 10);
    await CacheManager.set("test:prefix:b", "B", 10);
    await CacheManager.set("test:other:c", "C", 10);

    await CacheManager.delPrefix("test:prefix:");

    expect(await CacheManager.get("test:prefix:a")).toBeNull();
    expect(await CacheManager.get("test:prefix:b")).toBeNull();
    expect(await CacheManager.get("test:other:c")).toBe("C");
  });
});

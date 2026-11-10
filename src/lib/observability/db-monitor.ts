import db from "../db";
import { appLogger } from "./logger";
import { metrics } from "./metrics";

export interface DbHealthResult {
  healthy: boolean;
  latencyMs: number;
  error?: string;
}

export class DatabaseMonitor {
  private static SLOW_QUERY_THRESHOLD_MS = 200;

  /**
   * Ping database and measure roundtrip execution latency.
   */
  static async pingDatabase(): Promise<DbHealthResult> {
    const start = performance.now();
    try {
      await db.$queryRaw`SELECT 1`;
      const latencyMs = Math.round(performance.now() - start);
      metrics.recordHistogram("db_query_duration_ms", latencyMs, { query: "ping" });

      if (latencyMs > this.SLOW_QUERY_THRESHOLD_MS) {
        appLogger.warn(`Slow DB ping detected: ${latencyMs}ms`, { latencyMs });
      }

      return {
        healthy: true,
        latencyMs,
      };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      const errMsg = err instanceof Error ? err.message : "Database connection failed";
      appLogger.error("Database health check ping failed", { latencyMs, error: errMsg }, err);

      return {
        healthy: false,
        latencyMs,
        error: errMsg,
      };
    }
  }

  /**
   * Instrument and log slow queries.
   */
  static async trackQuery<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const res = await fn();
      const latencyMs = Math.round(performance.now() - start);
      metrics.recordHistogram("db_query_duration_ms", latencyMs, { query: name });

      if (latencyMs > this.SLOW_QUERY_THRESHOLD_MS) {
        appLogger.warn(`Slow database query detected: ${name} took ${latencyMs}ms`, {
          queryName: name,
          latencyMs,
        });
      }

      return res;
    } catch (error) {
      const latencyMs = Math.round(performance.now() - start);
      metrics.recordHistogram("db_query_duration_ms", latencyMs, { query: name, error: "true" });
      appLogger.error(`Database query '${name}' failed after ${latencyMs}ms`, { queryName: name }, error);
      throw error;
    }
  }
}

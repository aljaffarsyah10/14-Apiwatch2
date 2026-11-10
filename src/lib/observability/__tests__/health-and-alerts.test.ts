import { describe, it, expect, vi, beforeEach } from "vitest";
import { DatabaseMonitor } from "../db-monitor";
import { AlertManager } from "../alert-manager";
import db from "@/lib/db";

vi.mock("@/lib/db", () => ({
  default: {
    $queryRaw: vi.fn(),
  },
}));

describe("Database Health Monitor & Alert Manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AlertManager.clearCooldowns();
  });

  describe("DatabaseMonitor", () => {
    it("reports healthy with recorded latency on successful ping", async () => {
      vi.mocked(db.$queryRaw).mockResolvedValueOnce([{ "?column?": 1 }] as never);

      const health = await DatabaseMonitor.pingDatabase();

      expect(health.healthy).toBe(true);
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
      expect(health.error).toBeUndefined();
    });

    it("reports unhealthy and captures error message on failure", async () => {
      vi.mocked(db.$queryRaw).mockRejectedValueOnce(new Error("Connection terminated unexpectedly"));

      const health = await DatabaseMonitor.pingDatabase();

      expect(health.healthy).toBe(false);
      expect(health.error).toContain("Connection terminated unexpectedly");
    });
  });

  describe("AlertManager", () => {
    it("triggers system alert and suppresses duplicates within cooldown", async () => {
      const alertPayload = {
        title: "Test Alert",
        severity: "HIGH" as const,
        component: "queue",
        message: "Queue delayed jobs threshold exceeded",
      };

      // 1st trigger -> dispatched
      const first = await AlertManager.triggerSystemAlert(alertPayload);
      expect(first).toBe(true);

      // 2nd trigger during cooldown -> suppressed
      const second = await AlertManager.triggerSystemAlert(alertPayload);
      expect(second).toBe(false);
    });

    it("evaluates runtime health anomalies correctly", () => {
      const triggerSpy = vi.spyOn(AlertManager, "triggerSystemAlert");

      AlertManager.evaluateRuntimeHealth({
        dbHealthy: false,
        redisHealthy: true,
        recent5xxCount: 0,
        avgLatencyMs: 50,
      });

      expect(triggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Database Connectivity Lost",
          severity: "CRITICAL",
        })
      );
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardService } from "../dashboard.service";
import db from "@/lib/db";
import { CacheManager } from "@/lib/cache/cache-manager";
import { EndpointStatus, IncidentStatus } from "@prisma/client";

vi.mock("@/lib/db", () => {
  return {
    default: {
      endpoint: {
        findMany: vi.fn(),
      },
      incident: {
        findMany: vi.fn(),
      },
      monitoringCheck: {
        findMany: vi.fn(),
      },
    },
  };
});

describe("DashboardService Unit & Integration Tests", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await CacheManager.del("dashboard:summary:ws_test_1");
  });

  it("short-circuits with default zero-values when workspace has zero endpoints", async () => {
    vi.mocked(db.endpoint.findMany).mockResolvedValueOnce([]);

    const summary = await DashboardService.getSummary("ws_test_1");

    expect(summary.totalEndpoints).toBe(0);
    expect(summary.healthyCount).toBe(0);
    expect(summary.outageCount).toBe(0);
    expect(summary.uptime24h).toBe(100);
    expect(summary.avgResponseTimeMs).toBe(0);
    expect(summary.recentActiveIncidents).toEqual([]);
    expect(summary.latencyTimeline).toEqual([]);

    // DB incident and check queries should NOT have been called
    expect(db.incident.findMany).not.toHaveBeenCalled();
    expect(db.monitoringCheck.findMany).not.toHaveBeenCalled();
  });

  it("calculates accurate health count, 24h uptime percentage, and avg latency", async () => {
    const mockEndpoints = [
      { id: "ep_1", name: "Users API", status: EndpointStatus.UP },
      { id: "ep_2", name: "Billing API", status: EndpointStatus.DOWN },
      { id: "ep_3", name: "Analytics API", status: EndpointStatus.PAUSED },
    ];

    const mockIncidents = [
      {
        id: "inc_1",
        endpointId: "ep_2",
        status: IncidentStatus.OPEN,
        failureReason: "HTTP 500 Server Error",
        startedAt: new Date("2026-11-10T12:00:00Z"),
        endpoint: { name: "Billing API" },
      },
    ];

    const mockChecks = [
      { status: "SUCCESS", responseTimeMs: 120, checkedAt: new Date("2026-11-10T13:00:00Z") },
      { status: "SUCCESS", responseTimeMs: 80, checkedAt: new Date("2026-11-10T13:05:00Z") },
      { status: "FAILED", responseTimeMs: 500, checkedAt: new Date("2026-11-10T13:10:00Z") },
      { status: "SUCCESS", responseTimeMs: 100, checkedAt: new Date("2026-11-10T13:15:00Z") },
    ];

    vi.mocked(db.endpoint.findMany).mockResolvedValueOnce(mockEndpoints as never);
    vi.mocked(db.incident.findMany).mockResolvedValueOnce(mockIncidents as never);
    vi.mocked(db.monitoringCheck.findMany).mockResolvedValueOnce(mockChecks as never);

    const summary = await DashboardService.getSummary("ws_test_1");

    expect(summary.totalEndpoints).toBe(3);
    expect(summary.healthyCount).toBe(1);
    expect(summary.outageCount).toBe(1);
    expect(summary.pausedCount).toBe(1);
    expect(summary.activeIncidentsCount).toBe(1);

    // 3 successes out of 4 checks = 75% uptime
    expect(summary.uptime24h).toBe(75);
    // Latencies: (120 + 80 + 500 + 100) / 4 = 800 / 4 = 200ms
    expect(summary.avgResponseTimeMs).toBe(200);
    expect(summary.recentActiveIncidents.length).toBe(1);
    expect(summary.recentActiveIncidents[0].endpointName).toBe("Billing API");
  });

  it("serves from cache on subsequent calls and supports invalidation", async () => {
    vi.mocked(db.endpoint.findMany).mockResolvedValueOnce([]);

    // 1st call populates cache
    const initial = await DashboardService.getSummary("ws_test_1");
    expect(initial.totalEndpoints).toBe(0);

    // 2nd call uses cache (db.endpoint.findMany is NOT called again)
    const cached = await DashboardService.getSummary("ws_test_1");
    expect(cached.totalEndpoints).toBe(0);
    expect(db.endpoint.findMany).toHaveBeenCalledTimes(1);

    // After invalidateCache, next call hits DB again
    await DashboardService.invalidateCache("ws_test_1");
    vi.mocked(db.endpoint.findMany).mockResolvedValueOnce([]);
    await DashboardService.getSummary("ws_test_1");
    expect(db.endpoint.findMany).toHaveBeenCalledTimes(2);
  });
});

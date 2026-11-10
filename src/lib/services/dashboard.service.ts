import db from "../db";
import { EndpointStatus, IncidentStatus } from "@prisma/client";
import { CacheManager } from "../cache/cache-manager";

export interface DashboardSummary {
  totalEndpoints: number;
  healthyCount: number;
  outageCount: number;
  pausedCount: number;
  activeIncidentsCount: number;
  uptime24h: number;
  avgResponseTimeMs: number;
  recentActiveIncidents: Array<{
    id: string;
    endpointId: string;
    endpointName: string;
    failureReason: string | null;
    startedAt: Date;
  }>;
  latencyTimeline: Array<{
    timestamp: string;
    latency: number;
  }>;
}

export class DashboardService {
  /**
   * Invalidate cached dashboard metrics for a workspace.
   */
  static async invalidateCache(workspaceId: string): Promise<void> {
    await CacheManager.del(`dashboard:summary:${workspaceId}`);
  }

  static async getSummary(workspaceId: string): Promise<DashboardSummary> {
    const cacheKey = `dashboard:summary:${workspaceId}`;

    // 1. Check cache first (Redis / Memory, 15s TTL)
    const cached = await CacheManager.get<DashboardSummary>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Fetch endpoints for workspace with lean projection
    const endpoints = await db.endpoint.findMany({
      where: { workspaceId },
      select: { id: true, name: true, status: true },
    });

    const totalEndpoints = endpoints.length;

    // Short-circuit if workspace has no endpoints yet (saves 2 database roundtrips)
    if (totalEndpoints === 0) {
      const emptySummary: DashboardSummary = {
        totalEndpoints: 0,
        healthyCount: 0,
        outageCount: 0,
        pausedCount: 0,
        activeIncidentsCount: 0,
        uptime24h: 100,
        avgResponseTimeMs: 0,
        recentActiveIncidents: [],
        latencyTimeline: [],
      };
      await CacheManager.set(cacheKey, emptySummary, 15);
      return emptySummary;
    }

    const endpointIds = endpoints.map((e) => e.id);
    const healthyCount = endpoints.filter((e) => e.status === EndpointStatus.UP).length;
    const outageCount = endpoints.filter((e) => e.status === EndpointStatus.DOWN).length;
    const pausedCount = endpoints.filter((e) => e.status === EndpointStatus.PAUSED).length;

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 3. Parallelized execution of active incidents and 24h checks
    const [activeIncidents, checks24h] = await Promise.all([
      db.incident.findMany({
        where: {
          endpointId: { in: endpointIds },
          status: IncidentStatus.OPEN,
        },
        include: {
          endpoint: {
            select: { name: true },
          },
        },
        orderBy: { startedAt: "desc" },
        take: 5,
      }),
      db.monitoringCheck.findMany({
        where: {
          endpointId: { in: endpointIds },
          checkedAt: { gte: since24h },
        },
        select: {
          status: true,
          responseTimeMs: true,
          checkedAt: true,
        },
        orderBy: { checkedAt: "asc" },
        take: 100,
      }),
    ]);

    // Calculate Uptime 24h
    let uptime24h = 100;
    let avgResponseTimeMs = 0;

    if (checks24h.length > 0) {
      const successfulChecks = checks24h.filter((c) => c.status === "SUCCESS").length;
      uptime24h = Number(((successfulChecks / checks24h.length) * 100).toFixed(2));

      const validLatencies = checks24h
        .map((c) => c.responseTimeMs)
        .filter((r): r is number => r !== null && r > 0);

      if (validLatencies.length > 0) {
        const sum = validLatencies.reduce((acc, curr) => acc + curr, 0);
        avgResponseTimeMs = Math.round(sum / validLatencies.length);
      }
    }

    const latencyTimeline = checks24h.map((c) => ({
      timestamp: c.checkedAt.toISOString(),
      latency: c.responseTimeMs || 0,
    }));

    const result: DashboardSummary = {
      totalEndpoints,
      healthyCount,
      outageCount,
      pausedCount,
      activeIncidentsCount: activeIncidents.length,
      uptime24h,
      avgResponseTimeMs,
      recentActiveIncidents: activeIncidents.map((inc) => ({
        id: inc.id,
        endpointId: inc.endpointId,
        endpointName: inc.endpoint.name,
        failureReason: inc.failureReason,
        startedAt: inc.startedAt,
      })),
      latencyTimeline,
    };

    // Store in cache for 15 seconds
    await CacheManager.set(cacheKey, result, 15);

    return result;
  }
}

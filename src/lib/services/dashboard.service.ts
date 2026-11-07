import db from "../db";
import { EndpointStatus, IncidentStatus } from "@prisma/client";

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
  static async getSummary(workspaceId: string): Promise<DashboardSummary> {
    const endpoints = await db.endpoint.findMany({
      where: { workspaceId },
      select: { id: true, name: true, status: true },
    });

    const endpointIds = endpoints.map((e) => e.id);

    const totalEndpoints = endpoints.length;
    const healthyCount = endpoints.filter((e) => e.status === EndpointStatus.UP).length;
    const outageCount = endpoints.filter((e) => e.status === EndpointStatus.DOWN).length;
    const pausedCount = endpoints.filter((e) => e.status === EndpointStatus.PAUSED).length;

    // Active incidents
    const activeIncidents = await db.incident.findMany({
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
    });

    // Recent 24h checks
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const checks24h = await db.monitoringCheck.findMany({
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
    });

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

    return {
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
  }
}

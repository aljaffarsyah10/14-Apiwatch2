import { apiFetch } from "./client";

export interface DashboardSummaryData {
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
    startedAt: string;
  }>;
  latencyTimeline: Array<{
    timestamp: string;
    latency: number;
  }>;
}

export async function getDashboardSummary(): Promise<DashboardSummaryData> {
  return apiFetch<DashboardSummaryData>("/api/dashboard/summary");
}

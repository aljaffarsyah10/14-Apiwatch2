import { apiFetch } from "./client";

export interface EndpointReportItem {
  id: string;
  name: string;
  url: string;
  method: string;
  status: "UP" | "DOWN" | "PAUSED" | "PENDING";
  intervalSeconds: number;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  uptimePercentage: number;
  avgResponseTime: number;
  lastCheckedAt: string | null;
}

export interface ReportsData {
  period?: string;
  overallUptime: number;
  overallAvgLatency: number;
  totalEndpoints: number;
  endpoints: EndpointReportItem[];
}

export async function getReportsData(period?: "24h" | "7d" | "30d"): Promise<ReportsData> {
  const query = period ? `?period=${period}` : "";
  return apiFetch<ReportsData>(`/api/reports${query}`);
}

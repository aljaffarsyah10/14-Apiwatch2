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
  overallUptime: number;
  overallAvgLatency: number;
  totalEndpoints: number;
  endpoints: EndpointReportItem[];
}

export async function getReportsData(): Promise<ReportsData> {
  return apiFetch<ReportsData>("/api/reports");
}

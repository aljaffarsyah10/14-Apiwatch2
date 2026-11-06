export interface LatencyDataPoint {
  time: string;
  latencyMs: number;
  isSuccess: boolean;
  status: number;
}

export const mock24hLatencyData: LatencyDataPoint[] = [
  { time: "00:00", latencyMs: 82, isSuccess: true, status: 200 },
  { time: "02:00", latencyMs: 94, isSuccess: true, status: 200 },
  { time: "04:00", latencyMs: 76, isSuccess: true, status: 200 },
  { time: "06:00", latencyMs: 89, isSuccess: true, status: 200 },
  { time: "08:00", latencyMs: 145, isSuccess: true, status: 200 },
  { time: "10:00", latencyMs: 110, isSuccess: true, status: 200 },
  { time: "12:00", latencyMs: 128, isSuccess: true, status: 200 },
  { time: "14:00", latencyMs: 135, isSuccess: true, status: 200 },
  { time: "16:00", latencyMs: 98, isSuccess: true, status: 200 },
  { time: "18:00", latencyMs: 104, isSuccess: true, status: 200 },
  { time: "20:00", latencyMs: 112, isSuccess: true, status: 200 },
  { time: "22:00", latencyMs: 84, isSuccess: true, status: 200 },
  { time: "Now", latencyMs: 88, isSuccess: true, status: 200 },
];

export const mockDashboardMetrics = {
  totalEndpoints: 4,
  healthyCount: 2,
  downCount: 1,
  pausedCount: 1,
  avgResponseTimeMs: 134,
  uptimePercentage: 99.92,
  activeIncident: {
    endpointName: "Database Ingestion API",
    reason: "TIMEOUT (10,000ms exceeded)",
    startedAt: "18 minutes ago",
    endpointId: "ep-3",
  },
};

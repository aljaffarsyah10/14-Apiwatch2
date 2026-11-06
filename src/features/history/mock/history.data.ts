export interface CheckHistoryItem {
  id: string;
  endpointId: string;
  timestamp: string;
  isoTime: string;
  statusCode: number;
  responseTimeMs: number;
  isSuccess: boolean;
  status: "SUCCESS" | "FAILED" | "TIMEOUT" | "ERROR";
  errorCode?: string;
  errorMessage?: string;
  assertions: {
    statusMatch: boolean;
    headersMatch?: boolean;
    bodyMatch?: boolean;
  };
  requestDetails: {
    url: string;
    method: string;
    resolvedIp: string;
    responseSize: string;
  };
}

export const mockCheckHistory: CheckHistoryItem[] = [
  {
    id: "chk-1",
    endpointId: "ep-1",
    timestamp: "2 minutes ago",
    isoTime: "2026-11-06T22:35:12Z",
    statusCode: 200,
    responseTimeMs: 84,
    isSuccess: true,
    status: "SUCCESS",
    assertions: { statusMatch: true, headersMatch: true, bodyMatch: true },
    requestDetails: {
      url: "https://api.stripe.com/v1/events",
      method: "POST",
      resolvedIp: "54.187.205.235",
      responseSize: "1.4 KB",
    },
  },
  {
    id: "chk-2",
    endpointId: "ep-1",
    timestamp: "7 minutes ago",
    isoTime: "2026-11-06T22:30:10Z",
    statusCode: 200,
    responseTimeMs: 88,
    isSuccess: true,
    status: "SUCCESS",
    assertions: { statusMatch: true, headersMatch: true, bodyMatch: true },
    requestDetails: {
      url: "https://api.stripe.com/v1/events",
      method: "POST",
      resolvedIp: "54.187.205.235",
      responseSize: "1.4 KB",
    },
  },
  {
    id: "chk-3",
    endpointId: "ep-1",
    timestamp: "12 minutes ago",
    isoTime: "2026-11-06T22:25:11Z",
    statusCode: 200,
    responseTimeMs: 92,
    isSuccess: true,
    status: "SUCCESS",
    assertions: { statusMatch: true, headersMatch: true, bodyMatch: true },
    requestDetails: {
      url: "https://api.stripe.com/v1/events",
      method: "POST",
      resolvedIp: "54.187.205.235",
      responseSize: "1.4 KB",
    },
  },
  {
    id: "chk-4",
    endpointId: "ep-3",
    timestamp: "1 minute ago",
    isoTime: "2026-11-06T22:36:00Z",
    statusCode: 504,
    responseTimeMs: 10005,
    isSuccess: false,
    status: "TIMEOUT",
    errorCode: "TIMEOUT",
    errorMessage: "Connection timed out after 10,000ms threshold.",
    assertions: { statusMatch: false },
    requestDetails: {
      url: "https://data.apiwatch.dev/v1/ingest",
      method: "POST",
      resolvedIp: "104.21.72.18",
      responseSize: "0 B",
    },
  },
];

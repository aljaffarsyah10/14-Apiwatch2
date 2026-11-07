import { apiFetch } from "./client";

export interface CheckHistoryItem {
  id: string;
  endpointId: string;
  statusCode: number | null;
  responseTimeMs: number | null;
  isSuccess: boolean;
  status: "SUCCESS" | "FAILED" | "TIMEOUT" | "ERROR";
  errorCode: string | null;
  errorMessage: string | null;
  assertionResults?: {
    isTimeout?: boolean;
    isSsrfBlocked?: boolean;
    responseSize?: number;
    bodySnippet?: string | null;
  } | null;
  checkedAt: string;
}

export async function getEndpointHistory(
  endpointId: string,
  limit = 50
): Promise<CheckHistoryItem[]> {
  return apiFetch<CheckHistoryItem[]>(`/api/endpoints/${endpointId}/history?limit=${limit}`);
}

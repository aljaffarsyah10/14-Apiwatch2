import { apiFetch } from "./client";
import { EndpointFormValues } from "@/lib/validations/endpoint.schema";

export interface EndpointItem {
  id: string;
  name: string;
  url: string;
  method: string;
  intervalSeconds: number;
  timeoutMs: number;
  status: "UP" | "DOWN" | "PAUSED" | "PENDING";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  config?: {
    id: string;
    expectedStatusCodes: number[];
    requestHeadersEncrypted?: string | null;
    requestBody?: string | null;
    expectedBodyContains?: string | null;
    expectedBodyNotContains?: string | null;
    followRedirects: boolean;
  } | null;
  checks?: Array<{
    id: string;
    status: "SUCCESS" | "FAILED" | "TIMEOUT" | "ERROR";
    statusCode: number | null;
    responseTimeMs: number | null;
    checkedAt: string;
  }>;
  incidents?: Array<{
    id: string;
    status: "OPEN" | "RESOLVED";
    failureReason: string | null;
    startedAt: string;
    resolvedAt: string | null;
  }>;
  documentation?: {
    description?: string | null;
    requestExample?: string | null;
    responseExample?: string | null;
  } | null;
}

export async function getEndpoints(search?: string, status?: string): Promise<EndpointItem[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status && status !== "ALL") params.set("status", status);

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<EndpointItem[]>(`/api/endpoints${query}`);
}

export async function getEndpointById(id: string): Promise<EndpointItem> {
  return apiFetch<EndpointItem>(`/api/endpoints/${id}`);
}

export async function createEndpoint(data: EndpointFormValues): Promise<EndpointItem> {
  return apiFetch<EndpointItem>("/api/endpoints", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateEndpoint(
  id: string,
  data: Partial<EndpointFormValues>
): Promise<EndpointItem> {
  return apiFetch<EndpointItem>(`/api/endpoints/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteEndpoint(id: string): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(`/api/endpoints/${id}`, {
    method: "DELETE",
  });
}

export async function pauseEndpoint(id: string): Promise<EndpointItem> {
  return apiFetch<EndpointItem>(`/api/endpoints/${id}/pause`, {
    method: "POST",
  });
}

export async function resumeEndpoint(id: string): Promise<EndpointItem> {
  return apiFetch<EndpointItem>(`/api/endpoints/${id}/resume`, {
    method: "POST",
  });
}

export async function triggerManualCheck(id: string): Promise<unknown> {
  return apiFetch(`/api/endpoints/${id}/check`, {
    method: "POST",
  });
}

export async function checkAllEndpoints(): Promise<{
  success: boolean;
  message: string;
  totalEndpoints?: number;
  checkedCount?: number;
}> {
  return apiFetch("/api/endpoints/check-all", {
    method: "POST",
  });
}

export async function updateEndpointDocs(
  id: string,
  data: {
    description?: string;
    requestExample?: string;
    responseExample?: string;
  }
): Promise<{ success: boolean; data: unknown }> {
  return apiFetch(`/api/endpoints/${id}/docs`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function bulkEndpointAction(
  action: "pause" | "resume" | "check" | "delete",
  ids: string[]
): Promise<{ success: boolean; message: string; affectedCount: number }> {
  return apiFetch("/api/endpoints/bulk", {
    method: "POST",
    body: JSON.stringify({ action, ids }),
  });
}

export async function cloneEndpoint(id: string): Promise<{ success: boolean; message: string; data: EndpointItem }> {
  return apiFetch(`/api/endpoints/${id}/clone`, {
    method: "POST",
  });
}

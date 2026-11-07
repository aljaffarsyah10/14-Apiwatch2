export class ApiError extends Error {
  statusCode: number;
  data?: unknown;

  constructor(message: string, statusCode: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.data = data;
  }
}

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const headers = new Headers(options?.headers || {});
  if (!headers.has("Content-Type") && options?.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
    cache: options?.cache || "no-store",
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMsg =
      payload?.error ||
      payload?.message ||
      `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status, payload);
  }

  return (payload?.data !== undefined ? payload.data : payload) as T;
}

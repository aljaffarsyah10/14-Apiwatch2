import { validateSafeUrl } from "./ssrf-guard";

export interface HttpExecutionOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
  timeoutMs?: number;
  followRedirects?: boolean;
  maxRedirects?: number;
}

export interface HttpExecutionResult {
  statusCode: number | null;
  responseTimeMs: number;
  headers: Record<string, string>;
  bodySnippet: string;
  responseSizeBytes: number;
  isSuccess: boolean;
  isTimeout: boolean;
  isSsrfBlocked: boolean;
  errorMessage: string | null;
}

const MAX_RESPONSE_BYTES = 1024 * 1024; // 1 MB cap
const MAX_SNIPPET_BYTES = 4096; // 4 KB stored in DB

/**
 * Executes a monitored HTTP request with multi-layer SSRF defense, timeout protection,
 * redirect safety verification, and response size guards.
 */
export async function executeMonitoredRequest(
  options: HttpExecutionOptions
): Promise<HttpExecutionResult> {
  const {
    url,
    method = "GET",
    headers = {},
    body = null,
    timeoutMs = 5000,
    followRedirects = true,
    maxRedirects = 3,
  } = options;

  let currentUrl = url;
  let redirectsCount = 0;
  const startTime = Date.now();

  while (true) {
    // 1. SSRF Pre-flight Validation for every hop
    try {
      await validateSafeUrl(currentUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        statusCode: null,
        responseTimeMs: Date.now() - startTime,
        headers: {},
        bodySnippet: "",
        responseSizeBytes: 0,
        isSuccess: false,
        isTimeout: false,
        isSsrfBlocked: true,
        errorMessage: `SSRF Block: ${msg}`,
      };
    }

    // 2. Setup AbortController for strict timeout
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const requestHeaders = new Headers(headers);
      if (!requestHeaders.has("User-Agent")) {
        requestHeaders.set("User-Agent", "APIWatch-Monitor/1.0 (+https://apiwatch.io/bot)");
      }

      const fetchOptions: RequestInit = {
        method: method.toUpperCase(),
        headers: requestHeaders,
        signal: controller.signal,
        redirect: "manual", // Handle redirects manually to re-verify safe IP on each hop
      };

      if (body && !["GET", "HEAD"].includes(method.toUpperCase())) {
        fetchOptions.body = body;
      }

      const response = await fetch(currentUrl, fetchOptions);
      clearTimeout(timeoutHandle);

      // Handle Redirects
      if (
        followRedirects &&
        [301, 302, 303, 307, 308].includes(response.status) &&
        response.headers.has("location")
      ) {
        redirectsCount++;
        if (redirectsCount > maxRedirects) {
          return {
            statusCode: response.status,
            responseTimeMs: Date.now() - startTime,
            headers: {},
            bodySnippet: "",
            responseSizeBytes: 0,
            isSuccess: false,
            isTimeout: false,
            isSsrfBlocked: false,
            errorMessage: `Exceeded maximum redirect limit of ${maxRedirects}`,
          };
        }

        const location = response.headers.get("location")!;
        const nextUrl = new URL(location, currentUrl).toString();
        currentUrl = nextUrl;
        continue; // Next loop iteration will validate SSRF and fetch
      }

      // Read response body with size limit guard
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key.toLowerCase()] = val;
      });

      const responseTimeMs = Date.now() - startTime;

      let bodySnippet = "";
      let totalBytes = 0;

      if (response.body) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            totalBytes += value.length;
            if (chunks.reduce((acc, c) => acc + c.length, 0) < MAX_SNIPPET_BYTES) {
              chunks.push(value);
            }
            if (totalBytes > MAX_RESPONSE_BYTES) {
              reader.cancel();
              break;
            }
          }
        }

        const decoder = new TextDecoder("utf-8");
        const fullSnippetBuffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
        bodySnippet = decoder.decode(fullSnippetBuffer.subarray(0, MAX_SNIPPET_BYTES));
      }

      return {
        statusCode: response.status,
        responseTimeMs,
        headers: responseHeaders,
        bodySnippet,
        responseSizeBytes: totalBytes,
        isSuccess: true,
        isTimeout: false,
        isSsrfBlocked: false,
        errorMessage: null,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutHandle);
      const isTimeout =
        (err instanceof Error && err.name === "AbortError") ||
        (typeof err === "object" && err !== null && "type" in err && (err as { type: string }).type === "aborted");

      const responseTimeMs = Date.now() - startTime;
      const errorMsg = isTimeout
        ? `Request timed out after ${timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : String(err);

      return {
        statusCode: null,
        responseTimeMs,
        headers: {},
        bodySnippet: "",
        responseSizeBytes: 0,
        isSuccess: false,
        isTimeout,
        isSsrfBlocked: false,
        errorMessage: errorMsg,
      };
    }
  }
}

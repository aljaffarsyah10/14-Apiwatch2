import { NextRequest, NextResponse } from "next/server";
import { executeMonitoredRequest } from "@/lib/monitoring/http-executor";
import { evaluateAssertions } from "@/lib/monitoring/assertions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      url,
      method = "GET",
      expectedStatusCodes = "200",
      requestHeaders = [],
      requestBody = null,
      expectedBodyContains = null,
      followRedirects = false,
      timeoutMs = 10000,
    } = body;

    if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid HTTP or HTTPS URL" },
        { status: 400 }
      );
    }

    // Convert headers array to object
    const headers: Record<string, string> = {};
    if (Array.isArray(requestHeaders)) {
      for (const h of requestHeaders) {
        if (h.key?.trim()) {
          headers[h.key.trim()] = h.value;
        }
      }
    }

    const httpResult = await executeMonitoredRequest({
      url,
      method,
      headers,
      body: requestBody || null,
      timeoutMs: Math.min(timeoutMs, 15000),
      followRedirects,
    });

    if (httpResult.isSsrfBlocked) {
      return NextResponse.json(
        {
          success: false,
          error: httpResult.errorMessage || "SSRF Protection: Blocked target address",
        },
        { status: 400 }
      );
    }

    if (httpResult.isTimeout) {
      return NextResponse.json(
        {
          success: false,
          error: `Request timed out after ${timeoutMs}ms`,
          responseTimeMs: httpResult.responseTimeMs,
        },
        { status: 400 }
      );
    }

    if (httpResult.statusCode === null) {
      return NextResponse.json(
        {
          success: false,
          error: httpResult.errorMessage || "Network request failed to reach server",
          responseTimeMs: httpResult.responseTimeMs,
        },
        { status: 400 }
      );
    }

    const primaryExpectedCode = parseInt(expectedStatusCodes.split(",")[0].trim(), 10) || 200;
    const assertions = [];
    if (expectedBodyContains) {
      assertions.push({
        type: "body" as const,
        operator: "contains" as const,
        value: expectedBodyContains,
      });
    }

    const assertionResult = evaluateAssertions(primaryExpectedCode, assertions, {
      statusCode: httpResult.statusCode,
      headers: httpResult.headers,
      bodyText: httpResult.bodySnippet,
      responseTimeMs: httpResult.responseTimeMs,
    });

    return NextResponse.json({
      success: assertionResult.passed,
      statusCode: httpResult.statusCode,
      responseTimeMs: httpResult.responseTimeMs,
      responseSize: httpResult.responseSizeBytes,
      message: assertionResult.passed
        ? `HTTP ${httpResult.statusCode} OK in ${httpResult.responseTimeMs}ms. All assertions passed.`
        : assertionResult.failureReason || "Assertion check failed",
    });
  } catch (error) {
    console.error("[API POST /api/endpoints/test]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to execute test request",
      },
      { status: 500 }
    );
  }
}

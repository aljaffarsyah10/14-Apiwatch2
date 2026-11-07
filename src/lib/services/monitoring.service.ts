import db from "../db";
import { executeMonitoredRequest } from "../monitoring/http-executor";
import { evaluateAssertions } from "../monitoring/assertions";
import { IncidentService } from "./incident.service";
import { CheckStatus, MonitoringCheck } from "@prisma/client";
import { decryptCredential } from "../crypto";

export class MonitoringService {
  /**
   * Execute an active health check on a specific endpoint.
   */
  static async executeCheck(endpointId: string, isManual = false): Promise<MonitoringCheck | null> {
    const endpoint = await db.endpoint.findUnique({
      where: { id: endpointId },
      include: {
        config: true,
      },
    });

    if (!endpoint || (endpoint.status === "PAUSED" && !isManual)) {
      return null;
    }

    const config = endpoint.config;
    const timeoutMs = endpoint.timeoutMs || 10000;
    const expectedStatusCode = config?.expectedStatusCodes?.[0] || 200;

    // Parse headers
    let headers: Record<string, string> = {};
    if (config?.requestHeadersEncrypted) {
      try {
        const decrypted = decryptCredential(config.requestHeadersEncrypted);
        headers = JSON.parse(decrypted);
      } catch (err) {
        console.warn("[MonitoringService] Failed to decrypt headers:", err);
      }
    }

    // Execute HTTP request safely
    const httpResult = await executeMonitoredRequest({
      url: endpoint.url,
      method: endpoint.method,
      headers,
      body: config?.requestBody || null,
      timeoutMs,
      followRedirects: config?.followRedirects ?? false,
    });

    // Build custom assertion rules from config
    const assertions = [];
    if (config?.expectedBodyContains) {
      assertions.push({
        type: "body" as const,
        operator: "contains" as const,
        value: config.expectedBodyContains,
      });
    }
    if (config?.expectedBodyNotContains) {
      assertions.push({
        type: "body" as const,
        operator: "not_contains" as const,
        value: config.expectedBodyNotContains,
      });
    }

    // Determine status & failure reasons
    let status: CheckStatus = CheckStatus.SUCCESS;
    let failureReason: string | null = null;

    if (httpResult.isTimeout) {
      status = CheckStatus.TIMEOUT;
      failureReason = httpResult.errorMessage || "Request timed out";
    } else if (httpResult.isSsrfBlocked) {
      status = CheckStatus.ERROR;
      failureReason = httpResult.errorMessage || "SSRF Blocked";
    } else if (!httpResult.isSuccess || httpResult.statusCode === null) {
      status = CheckStatus.ERROR;
      failureReason = httpResult.errorMessage || "Network connection failure";
    } else {
      // Evaluate assertions
      const assertionResult = evaluateAssertions(expectedStatusCode, assertions, {
        statusCode: httpResult.statusCode,
        headers: httpResult.headers,
        bodyText: httpResult.bodySnippet,
        responseTimeMs: httpResult.responseTimeMs,
      });

      if (!assertionResult.passed) {
        status = CheckStatus.FAILED;
        failureReason = assertionResult.failureReason || `Assertion failed: ${assertionResult.failedAssertion}`;
      }
    }

    // Persist MonitoringCheck record
    const checkRecord = await db.monitoringCheck.create({
      data: {
        endpointId: endpoint.id,
        status,
        statusCode: httpResult.statusCode,
        responseTimeMs: httpResult.responseTimeMs,
        isSuccess: status === CheckStatus.SUCCESS,
        errorMessage: failureReason,
        assertionResults: {
          isTimeout: httpResult.isTimeout,
          isSsrfBlocked: httpResult.isSsrfBlocked,
          responseSize: httpResult.responseSizeBytes,
          bodySnippet: httpResult.bodySnippet || null,
        },
      },
    });

    // Touch endpoint updatedAt
    await db.endpoint.update({
      where: { id: endpoint.id },
      data: {
        updatedAt: new Date(),
      },
    });

    // Process incident lifecycle
    if (status === CheckStatus.SUCCESS) {
      await IncidentService.handleCheckRecovery(endpoint.id);
    } else {
      await IncidentService.handleCheckFailure(endpoint.id, failureReason || "Check failed", httpResult.statusCode);
    }

    return checkRecord;
  }
}

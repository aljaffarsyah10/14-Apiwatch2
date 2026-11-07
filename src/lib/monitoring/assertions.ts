export interface AssertionRule {
  type: "status_code" | "header" | "body" | "latency_ms";
  operator?: "equals" | "contains" | "not_contains" | "exists" | "less_than";
  key?: string;
  value?: string | number;
}

export interface AssertionEvaluationContext {
  statusCode: number;
  headers: Record<string, string>;
  bodyText: string;
  responseTimeMs: number;
}

export interface AssertionResult {
  passed: boolean;
  failedAssertion?: string;
  failureReason?: string;
}

/**
 * Evaluates configured assertions against the actual HTTP response context.
 */
export function evaluateAssertions(
  expectedStatusCode: number,
  assertionsJson: unknown,
  context: AssertionEvaluationContext
): AssertionResult {
  // 1. Primary Status Code check
  if (context.statusCode !== expectedStatusCode) {
    return {
      passed: false,
      failedAssertion: "status_code",
      failureReason: `Expected status code ${expectedStatusCode}, but received ${context.statusCode}`,
    };
  }

  // 2. Custom assertions array (if provided)
  if (!assertionsJson || !Array.isArray(assertionsJson) || assertionsJson.length === 0) {
    return { passed: true };
  }

  const rules = assertionsJson as AssertionRule[];

  for (const rule of rules) {
    switch (rule.type) {
      case "status_code": {
        const expected = Number(rule.value ?? expectedStatusCode);
        if (context.statusCode !== expected) {
          return {
            passed: false,
            failedAssertion: "status_code",
            failureReason: `Status code ${context.statusCode} did not match expected ${expected}`,
          };
        }
        break;
      }

      case "header": {
        if (!rule.key) continue;
        const headerName = rule.key.toLowerCase();
        const actualValue = context.headers[headerName];

        if (rule.operator === "exists") {
          if (actualValue === undefined) {
            return {
              passed: false,
              failedAssertion: `header:${rule.key}`,
              failureReason: `Expected response header '${rule.key}' to exist, but was missing`,
            };
          }
        } else if (rule.operator === "contains") {
          if (!actualValue || !actualValue.includes(String(rule.value ?? ""))) {
            return {
              passed: false,
              failedAssertion: `header:${rule.key}`,
              failureReason: `Header '${rule.key}' ('${actualValue || ""}') did not contain '${rule.value}'`,
            };
          }
        } else {
          // default equals
          if (actualValue !== String(rule.value ?? "")) {
            return {
              passed: false,
              failedAssertion: `header:${rule.key}`,
              failureReason: `Header '${rule.key}' expected '${rule.value}', but got '${actualValue || ""}'`,
            };
          }
        }
        break;
      }

      case "body": {
        const targetValue = String(rule.value ?? "");
        if (rule.operator === "not_contains") {
          if (context.bodyText.includes(targetValue)) {
            return {
              passed: false,
              failedAssertion: "body",
              failureReason: `Response body unexpectedly contained '${targetValue}'`,
            };
          }
        } else {
          // default contains
          if (!context.bodyText.includes(targetValue)) {
            return {
              passed: false,
              failedAssertion: "body",
              failureReason: `Response body did not contain expected text '${targetValue}'`,
            };
          }
        }
        break;
      }

      case "latency_ms": {
        const maxLatency = Number(rule.value ?? 0);
        if (maxLatency > 0 && context.responseTimeMs > maxLatency) {
          return {
            passed: false,
            failedAssertion: "latency_ms",
            failureReason: `Response time ${context.responseTimeMs}ms exceeded threshold of ${maxLatency}ms`,
          };
        }
        break;
      }
    }
  }

  return { passed: true };
}

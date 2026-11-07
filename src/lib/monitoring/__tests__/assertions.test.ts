import { describe, it, expect } from "vitest";
import { evaluateAssertions, AssertionRule } from "../assertions";

describe("Assertion Evaluation Engine", () => {
  it("should pass when status code matches and no custom rules given", () => {
    const result = evaluateAssertions(200, null, {
      statusCode: 200,
      headers: {},
      bodyText: "OK",
      responseTimeMs: 120,
    });
    expect(result.passed).toBe(true);
  });

  it("should fail when status code does not match", () => {
    const result = evaluateAssertions(200, null, {
      statusCode: 500,
      headers: {},
      bodyText: "Internal Server Error",
      responseTimeMs: 150,
    });
    expect(result.passed).toBe(false);
    expect(result.failedAssertion).toBe("status_code");
    expect(result.failureReason).toContain("Expected status code 200, but received 500");
  });

  it("should evaluate header assertions correctly", () => {
    const rules: AssertionRule[] = [
      { type: "header", key: "content-type", operator: "contains", value: "application/json" },
      { type: "header", key: "x-request-id", operator: "exists" },
    ];

    const passResult = evaluateAssertions(200, rules, {
      statusCode: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-request-id": "req-9876",
      },
      bodyText: '{"status":"ok"}',
      responseTimeMs: 80,
    });
    expect(passResult.passed).toBe(true);

    const failResult = evaluateAssertions(200, rules, {
      statusCode: 200,
      headers: {
        "content-type": "text/html",
      },
      bodyText: "<html></html>",
      responseTimeMs: 80,
    });
    expect(failResult.passed).toBe(false);
    expect(failResult.failedAssertion).toContain("header:content-type");
  });

  it("should evaluate body contains and not_contains assertions", () => {
    const rules: AssertionRule[] = [
      { type: "body", operator: "contains", value: "healthy" },
      { type: "body", operator: "not_contains", value: "critical_error" },
    ];

    const passResult = evaluateAssertions(200, rules, {
      statusCode: 200,
      headers: {},
      bodyText: '{"status": "healthy", "service": "auth"}',
      responseTimeMs: 95,
    });
    expect(passResult.passed).toBe(true);

    const failResult = evaluateAssertions(200, rules, {
      statusCode: 200,
      headers: {},
      bodyText: '{"status": "healthy", "warning": "critical_error"}',
      responseTimeMs: 95,
    });
    expect(failResult.passed).toBe(false);
    expect(failResult.failureReason).toContain("unexpectedly contained 'critical_error'");
  });

  it("should enforce latency threshold assertion", () => {
    const rules: AssertionRule[] = [
      { type: "latency_ms", value: 300 },
    ];

    const passResult = evaluateAssertions(200, rules, {
      statusCode: 200,
      headers: {},
      bodyText: "",
      responseTimeMs: 250,
    });
    expect(passResult.passed).toBe(true);

    const failResult = evaluateAssertions(200, rules, {
      statusCode: 200,
      headers: {},
      bodyText: "",
      responseTimeMs: 450,
    });
    expect(failResult.passed).toBe(false);
    expect(failResult.failedAssertion).toBe("latency_ms");
    expect(failResult.failureReason).toContain("exceeded threshold of 300ms");
  });
});

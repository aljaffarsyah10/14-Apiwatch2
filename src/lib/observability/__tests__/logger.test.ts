import { describe, it, expect, vi, beforeEach } from "vitest";
import { Logger, sanitizeLogData } from "../logger";

describe("Structured Logger & PII Redaction", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("redacts sensitive credential keys in nested data structures", () => {
    const sensitivePayload = {
      user: "engineer",
      password: "SuperSecretPassword123!",
      authToken: "bearer-token-xyz",
      nested: {
        apiKey: "api-secret-999",
        safeData: "public-info",
        cookie: "session=abc12345",
      },
    };

    const sanitized = sanitizeLogData(sensitivePayload);

    expect(sanitized.user).toBe("engineer");
    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.authToken).toBe("[REDACTED]");
    expect(sanitized.nested.apiKey).toBe("[REDACTED]");
    expect(sanitized.nested.cookie).toBe("[REDACTED]");
    expect(sanitized.nested.safeData).toBe("public-info");
  });

  it("emits valid JSON structured logs with timestamp, level, and service", () => {
    const logger = new Logger("test-service");
    logger.info("Service initialized", { port: 3000 });

    expect(consoleLogSpy).toHaveBeenCalled();
    const loggedStr = consoleLogSpy.mock.calls[0][0];
    const parsed = JSON.parse(loggedStr);

    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("Service initialized");
    expect(parsed.service).toBe("test-service");
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.context.port).toBe(3000);
  });

  it("creates child loggers that inherit parent context", () => {
    const baseLogger = new Logger("api-gateway");
    const reqLogger = baseLogger.withContext({ requestId: "req_101", workspaceId: "ws_404" });

    reqLogger.error("Failed to connect upstream", { attempt: 3 });

    expect(consoleErrorSpy).toHaveBeenCalled();
    const loggedStr = consoleErrorSpy.mock.calls[0][0];
    const parsed = JSON.parse(loggedStr);

    expect(parsed.level).toBe("error");
    expect(parsed.context.requestId).toBe("req_101");
    expect(parsed.context.workspaceId).toBe("ws_404");
    expect(parsed.context.attempt).toBe(3);
  });

  it("generates random high-entropy trace IDs", () => {
    const id1 = Logger.generateTraceId();
    const id2 = Logger.generateTraceId();
    expect(id1.startsWith("trc_")).toBe(true);
    expect(id1).not.toBe(id2);
  });
});

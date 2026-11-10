import { describe, it, expect, beforeEach } from "vitest";
import { errorTracker } from "../error-tracker";

describe("Error Tracking & Telemetry Engine", () => {
  beforeEach(() => {
    errorTracker.clear();
  });

  it("captures exceptions and stores breadcrumbs", () => {
    errorTracker.addBreadcrumb({
      category: "http",
      message: "Incoming GET /api/endpoints",
      level: "info",
    });

    errorTracker.addBreadcrumb({
      category: "db",
      message: "Querying endpoints table",
      level: "info",
    });

    const err = new Error("Database timeout after 5000ms");
    const eventId = errorTracker.captureException(err, { endpointId: "ep_123" });

    expect(eventId.startsWith("err_")).toBe(true);

    const recent = errorTracker.getRecentErrors();
    expect(recent.length).toBe(1);
    expect(recent[0].message).toBe("Database timeout after 5000ms");
    expect(recent[0].breadcrumbs.length).toBe(2);
    expect(recent[0].breadcrumbs[0].message).toBe("Incoming GET /api/endpoints");
    expect(recent[0].context?.endpointId).toBe("ep_123");
  });

  it("deduplicates identical errors and increments recurrence counter", () => {
    const errorA = new TypeError("Cannot read properties of null");
    const errorB = new TypeError("Cannot read properties of null");

    errorTracker.captureException(errorA);
    errorTracker.captureException(errorB);
    errorTracker.captureException(errorB);

    const recent = errorTracker.getRecentErrors();
    // Only 1 unique fingerprint group should be stored with count = 3
    expect(recent.length).toBe(1);
    expect(recent[0].count).toBe(3);
  });
});

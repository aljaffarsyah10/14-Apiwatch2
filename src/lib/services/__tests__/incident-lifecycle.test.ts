import { describe, it, expect } from "vitest";

describe("Incident Lifecycle & Threshold Evaluation Rules", () => {
  interface SimulatedCheck {
    status: "SUCCESS" | "FAILED" | "TIMEOUT" | "ERROR";
  }

  function evaluateShouldOpenIncident(
    recentChecks: SimulatedCheck[],
    threshold = 3,
    existingOpenIncident = false
  ): { shouldOpen: boolean; reason?: string } {
    if (existingOpenIncident) {
      return { shouldOpen: false, reason: "Incident already open" };
    }

    if (recentChecks.length < threshold) {
      return { shouldOpen: false, reason: "Insufficient consecutive checks" };
    }

    const latestSlice = recentChecks.slice(0, threshold);
    const allFailed = latestSlice.every((c) => c.status !== "SUCCESS");

    if (allFailed) {
      return { shouldOpen: true, reason: "Consecutive failure threshold breached" };
    }

    return { shouldOpen: false, reason: "Contains successful checks within threshold" };
  }

  function evaluateShouldResolveIncident(
    latestCheck: SimulatedCheck,
    hasOpenIncident: boolean
  ): boolean {
    return hasOpenIncident && latestCheck.status === "SUCCESS";
  }

  it("should not open an incident on a single transient failure (threshold = 3)", () => {
    const checks: SimulatedCheck[] = [{ status: "FAILED" }];
    const evalResult = evaluateShouldOpenIncident(checks, 3);
    expect(evalResult.shouldOpen).toBe(false);
  });

  it("should not open an incident when intermittent success occurs within threshold window", () => {
    const checks: SimulatedCheck[] = [
      { status: "FAILED" },
      { status: "SUCCESS" },
      { status: "FAILED" },
    ];
    const evalResult = evaluateShouldOpenIncident(checks, 3);
    expect(evalResult.shouldOpen).toBe(false);
  });

  it("should open an incident when 3 consecutive checks fail", () => {
    const checks: SimulatedCheck[] = [
      { status: "FAILED" },
      { status: "TIMEOUT" },
      { status: "ERROR" },
    ];
    const evalResult = evaluateShouldOpenIncident(checks, 3);
    expect(evalResult.shouldOpen).toBe(true);
    expect(evalResult.reason).toContain("threshold breached");
  });

  it("should not create duplicate incidents if an incident is already OPEN", () => {
    const checks: SimulatedCheck[] = [
      { status: "FAILED" },
      { status: "FAILED" },
      { status: "FAILED" },
    ];
    const evalResult = evaluateShouldOpenIncident(checks, 3, true);
    expect(evalResult.shouldOpen).toBe(false);
    expect(evalResult.reason).toBe("Incident already open");
  });

  it("should automatically resolve active incident on subsequent successful probe", () => {
    const recoveryResult = evaluateShouldResolveIncident({ status: "SUCCESS" }, true);
    expect(recoveryResult).toBe(true);

    const continuedFailureResult = evaluateShouldResolveIncident({ status: "FAILED" }, true);
    expect(continuedFailureResult).toBe(false);
  });
});

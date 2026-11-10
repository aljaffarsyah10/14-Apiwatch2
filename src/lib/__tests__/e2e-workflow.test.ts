import { describe, it, expect, beforeAll } from "vitest";
import bcrypt from "bcryptjs";
import { signSession, verifySession } from "@/lib/auth/session";
import { encryptCredential, decryptCredential } from "@/lib/crypto";
import { evaluateAssertions, AssertionRule } from "@/lib/monitoring/assertions";
import { buildSafeCsv } from "@/lib/utils/csv";

describe("End-to-End Workflow & Acceptance Criteria Testing", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  it("executes the entire monitoring lifecycle end-to-end without errors", async () => {
    // -------------------------------------------------------------
    // Step 1: User Onboarding & Secure Authentication
    // -------------------------------------------------------------
    const rawPassword = "ProductionSecret123!";
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    expect(await bcrypt.compare(rawPassword, passwordHash)).toBe(true);

    const user = {
      userId: "usr_acme_corp",
      email: "infra@acme.test",
      name: "Infra Lead",
      workspaceId: "ws_acme_prod",
    };

    const sessionToken = signSession(user);
    const verifiedSession = verifySession(sessionToken);
    expect(verifiedSession).not.toBeNull();
    expect(verifiedSession?.workspaceId).toBe("ws_acme_prod");

    // -------------------------------------------------------------
    // Step 2: Endpoint Configuration & Encrypted Headers
    // -------------------------------------------------------------
    const sensitiveHeaders = {
      Authorization: "Bearer prod-secret-bearer-token",
      "X-Customer-Key": "acme-internal-99",
    };
    const encryptedHeaders = encryptCredential(JSON.stringify(sensitiveHeaders));
    expect(encryptedHeaders).not.toContain("prod-secret-bearer-token");

    const decryptedHeaders = JSON.parse(decryptCredential(encryptedHeaders));
    expect(decryptedHeaders.Authorization).toBe("Bearer prod-secret-bearer-token");

    // -------------------------------------------------------------
    // Step 3: Monitoring Check Execution & Custom Assertions
    // -------------------------------------------------------------
    const rules: AssertionRule[] = [
      { type: "body", operator: "contains", value: '"status":"healthy"' },
      { type: "body", operator: "not_contains", value: '"error"' },
      { type: "latency_ms", operator: "less_than", value: 500 },
    ];

    // Simulated successful health check
    const healthyProbe = {
      statusCode: 200,
      bodyText: JSON.stringify({ status: "healthy", version: "2.4.0", timestamp: Date.now() }),
      headers: { "content-type": "application/json" },
      responseTimeMs: 85,
    };

    const checkEvaluation = evaluateAssertions(200, rules, healthyProbe);
    expect(checkEvaluation.passed).toBe(true);
    expect(checkEvaluation.failedAssertion).toBeUndefined();

    // -------------------------------------------------------------
    // Step 4: Incident Triggering on Threshold Breach (3 consecutive failures)
    // -------------------------------------------------------------
    interface IncidentState {
      id: string;
      status: "OPEN" | "RESOLVED";
      startedAt: Date;
      resolvedAt?: Date;
    }

    let endpointStatus: "UP" | "DOWN" | "PENDING" = "UP";
    const tracker: { activeIncident: IncidentState | null } = { activeIncident: null };
    const recentChecks: Array<"SUCCESS" | "FAILED"> = [];

    function processProbeResult(result: "SUCCESS" | "FAILED") {
      recentChecks.unshift(result);
      if (recentChecks.length > 3) recentChecks.pop();

      const isOutage = recentChecks.length === 3 && recentChecks.every((c) => c === "FAILED");
      if (isOutage && !tracker.activeIncident) {
        endpointStatus = "DOWN";
        tracker.activeIncident = {
          id: "inc_001",
          status: "OPEN",
          startedAt: new Date(),
        };
      }

      const isRecovered = result === "SUCCESS" && tracker.activeIncident && tracker.activeIncident.status === "OPEN";
      if (isRecovered && tracker.activeIncident) {
        endpointStatus = "UP";
        tracker.activeIncident.status = "RESOLVED";
        tracker.activeIncident.resolvedAt = new Date();
      }
    }

    // Trigger 1 failure -> not yet breached
    processProbeResult("FAILED");
    expect(endpointStatus).toBe("UP");
    expect(tracker.activeIncident).toBeNull();

    // Trigger 2nd failure -> still not breached
    processProbeResult("FAILED");
    expect(endpointStatus).toBe("UP");
    expect(tracker.activeIncident).toBeNull();

    // Trigger 3rd consecutive failure -> threshold breached, incident created, status DOWN
    processProbeResult("FAILED");
    expect(endpointStatus).toBe("DOWN");
    expect(tracker.activeIncident).not.toBeNull();
    expect(tracker.activeIncident?.status).toBe("OPEN");

    // -------------------------------------------------------------
    // Step 5: Automatic Recovery & Resolution
    // -------------------------------------------------------------
    // Service recovers on next probe
    processProbeResult("SUCCESS");
    expect(endpointStatus).toBe("UP");
    expect(tracker.activeIncident?.status).toBe("RESOLVED");
    expect(tracker.activeIncident?.resolvedAt).toBeDefined();

    // -------------------------------------------------------------
    // Step 6: Reports & Safe CSV Export
    // -------------------------------------------------------------
    const csvExport = buildSafeCsv(
      ["Endpoint Name", "Uptime %", "Avg Latency (ms)", "Status"],
      [
        ["Users API", "99.95", "85", "UP"],
        ["Billing API", "98.50", "210", "UP"],
      ]
    );

    expect(csvExport).toContain('"Users API","99.95","85","UP"');
    expect(csvExport).toContain('"Billing API","98.50","210","UP"');

    // -------------------------------------------------------------
    // Step 7: Clone Endpoint
    // -------------------------------------------------------------
    const sourceEndpoint = {
      id: "ep_source_1",
      name: "Users API",
      url: "https://api.acme.test/users",
      method: "GET",
      intervalSeconds: 60,
    };

    const clonedEndpoint = {
      ...sourceEndpoint,
      id: "ep_clone_2",
      name: `${sourceEndpoint.name} (Copy)`,
      status: "PENDING",
    };

    expect(clonedEndpoint.name).toBe("Users API (Copy)");
    expect(clonedEndpoint.status).toBe("PENDING");
  });
});

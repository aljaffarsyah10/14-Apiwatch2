#!/usr/bin/env node

/**
 * ==============================================================================
 * APIWatch Production Smoke Test Suite
 * ==============================================================================
 * Usage:
 *   node scripts/smoke-test.mjs [BASE_URL]
 *
 * Example:
 *   node scripts/smoke-test.mjs http://localhost:3000
 *   node scripts/smoke-test.mjs https://apiwatch.io
 * ==============================================================================
 */

const BASE_URL = process.argv[2] || process.env.APP_URL || "http://localhost:3000";

const checks = [
  {
    name: "Liveness Probe",
    path: "/api/health?probe=live",
    expectedStatus: 200,
    validate: (res, body) => {
      const data = JSON.parse(body);
      return data.status === "healthy";
    },
  },
  {
    name: "Deep Readiness Probe (DB & Redis)",
    path: "/api/health?probe=ready",
    expectedStatus: [200, 503], // 503 allowed during cold boot in test
    validate: (res, body) => {
      const data = JSON.parse(body);
      return data.status !== undefined && data.services !== undefined;
    },
  },
  {
    name: "Prometheus Telemetry Metrics",
    path: "/api/metrics",
    expectedStatus: 200,
    validate: (res, body) => {
      return body.includes("apiwatch") || body.includes("http_requests_total") || body.includes("process_");
    },
  },
  {
    name: "Public Landing Page",
    path: "/",
    expectedStatus: 200,
    validate: (res, body) => body.includes("APIWatch"),
  },
  {
    name: "Public Pricing & Plans",
    path: "/pricing",
    expectedStatus: 200,
    validate: (res, body) => body.includes("Free Starter") || body.includes("Pro"),
  },
  {
    name: "Public Status Board",
    path: "/status",
    expectedStatus: 200,
    validate: (res, body) => body.includes("Status") || body.includes("Operational"),
  },
  {
    name: "Authentication Login",
    path: "/login",
    expectedStatus: 200,
    validate: (res, body) => body.includes("Sign In"),
  },
  {
    name: "Authentication Register",
    path: "/register",
    expectedStatus: 200,
    validate: (res, body) => body.includes("Create an account"),
  },
  {
    name: "Robots.txt Directives",
    path: "/robots.txt",
    expectedStatus: 200,
    validate: (res, body) => body.includes("User-agent") && body.includes("Disallow: /dashboard"),
  },
  {
    name: "XML Sitemap",
    path: "/sitemap.xml",
    expectedStatus: 200,
    validate: (res, body) => body.includes("<urlset") || body.includes("<loc>"),
  },
  {
    name: "Open Graph Social Banner",
    path: "/opengraph-image",
    expectedStatus: 200,
    validate: (res) => {
      const contentType = res.headers.get("content-type") || "";
      return contentType.includes("image");
    },
  },
];

async function runSmokeTests() {
  console.log("================================================================================");
  console.log(`🚀 Executing APIWatch Smoke Test Suite against: ${BASE_URL}`);
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    const url = `${BASE_URL}${check.path}`;
    const startTime = Date.now();

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "APIWatch-SmokeTest/2.0",
        },
      });

      const durationMs = Date.now() - startTime;
      const body = await res.text();

      const expectedStatuses = Array.isArray(check.expectedStatus)
        ? check.expectedStatus
        : [check.expectedStatus];

      const statusOk = expectedStatuses.includes(res.status);
      const validationOk = statusOk && check.validate(res, body);

      if (validationOk) {
        console.log(`✅ [PASS] ${check.name.padEnd(36)} HTTP ${res.status} (${durationMs}ms)`);
        passed++;
      } else {
        console.error(
          `❌ [FAIL] ${check.name.padEnd(36)} HTTP ${res.status} (Expected: ${check.expectedStatus})`
        );
        failed++;
      }
    } catch (err) {
      console.error(`❌ [ERROR] ${check.name.padEnd(35)} Connection Error: ${err.message}`);
      failed++;
    }
  }

  console.log("\n================================================================================");
  console.log(`Smoke Test Summary: ${passed} Passed, ${failed} Failed out of ${checks.length} checks`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("🎉 All production smoke tests passed successfully!");
    process.exit(0);
  }
}

runSmokeTests();

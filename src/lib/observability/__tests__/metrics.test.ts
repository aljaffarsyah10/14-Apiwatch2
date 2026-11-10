import { describe, it, expect, beforeEach } from "vitest";
import { metrics, measureAsync } from "../metrics";

describe("APM, Metrics & Prometheus Exporter", () => {
  beforeEach(() => {
    metrics.reset();
  });

  it("increments counters with and without label dimensions", () => {
    metrics.increment("http_requests_total", 1, { method: "GET", status: "200" });
    metrics.increment("http_requests_total", 2, { method: "GET", status: "200" });
    metrics.increment("http_requests_total", 1, { method: "POST", status: "201" });

    expect(metrics.getCounter("http_requests_total", { method: "GET", status: "200" })).toBe(3);
    expect(metrics.getCounter("http_requests_total", { method: "POST", status: "201" })).toBe(1);
    expect(metrics.getCounter("http_requests_total", { method: "DELETE" })).toBe(0);
  });

  it("calculates accurate histogram percentiles (p50, p90, p99, min, max, avg)", () => {
    // Record latencies from 10ms to 100ms
    for (let i = 1; i <= 100; i++) {
      metrics.recordHistogram("api_latency_ms", i);
    }

    const p = metrics.getHistogramPercentiles("api_latency_ms");
    expect(p.count).toBe(100);
    expect(p.min).toBe(1);
    expect(p.max).toBe(100);
    expect(p.avg).toBe(51); // (100 * 101) / 2 / 100 = 50.5 ~ 51
    expect(p.p50).toBe(51);
    expect(p.p90).toBe(91);
    expect(p.p99).toBe(100);
  });

  it("generates valid Prometheus text export", () => {
    metrics.increment("checks_executed_total", 42);
    metrics.setGauge("active_monitors_gauge", 15);

    const output = metrics.toPrometheusFormat();

    expect(output).toContain("process_uptime_seconds");
    expect(output).toContain("nodejs_heap_used_bytes");
    expect(output).toContain("checks_executed_total 42");
    expect(output).toContain("active_monitors_gauge 15");
  });

  it("measureAsync accurately measures execution duration", async () => {
    const result = await measureAsync("sleep_test", async () => {
      await new Promise((r) => setTimeout(r, 20));
      return "done";
    });

    expect(result).toBe("done");
    const p = metrics.getHistogramPercentiles("sleep_test");
    expect(p.count).toBe(1);
    expect(p.avg).toBeGreaterThanOrEqual(15);
  });
});

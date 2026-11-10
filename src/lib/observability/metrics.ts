export interface Percentiles {
  p50: number;
  p90: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  count: number;
}

class MetricsRegistry {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private maxHistogramSamples = 500;

  increment(metricName: string, value: number = 1, labels?: Record<string, string>) {
    const key = this.formatKey(metricName, labels);
    const curr = this.counters.get(key) || 0;
    this.counters.set(key, curr + value);
  }

  setGauge(metricName: string, value: number, labels?: Record<string, string>) {
    const key = this.formatKey(metricName, labels);
    this.gauges.set(key, value);
  }

  recordHistogram(metricName: string, sample: number, labels?: Record<string, string>) {
    const key = this.formatKey(metricName, labels);
    let values = this.histograms.get(key);
    if (!values) {
      values = [];
      this.histograms.set(key, values);
    }
    values.push(sample);
    if (values.length > this.maxHistogramSamples) {
      values.shift();
    }
  }

  getCounter(metricName: string, labels?: Record<string, string>): number {
    return this.counters.get(this.formatKey(metricName, labels)) || 0;
  }

  getHistogramPercentiles(metricName: string, labels?: Record<string, string>): Percentiles {
    const key = this.formatKey(metricName, labels);
    const values = this.histograms.get(key) || [];
    if (values.length === 0) {
      return { p50: 0, p90: 0, p99: 0, min: 0, max: 0, avg: 0, count: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, curr) => acc + curr, 0);

    const getIdx = (pct: number) => Math.min(count - 1, Math.floor((pct / 100) * count));

    return {
      p50: Math.round(sorted[getIdx(50)]),
      p90: Math.round(sorted[getIdx(90)]),
      p99: Math.round(sorted[getIdx(99)]),
      min: Math.round(sorted[0]),
      max: Math.round(sorted[count - 1]),
      avg: Math.round(sum / count),
      count,
    };
  }

  private formatKey(metric: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) return metric;
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(",");
    return `${metric}{${labelStr}}`;
  }

  /**
   * Generates Prometheus / OpenMetrics compliant text payload.
   */
  toPrometheusFormat(): string {
    const lines: string[] = [];

    // System Process Gauges
    lines.push("# HELP process_uptime_seconds Process uptime in seconds.");
    lines.push("# TYPE process_uptime_seconds gauge");
    lines.push(`process_uptime_seconds ${Math.floor(process.uptime())}`);

    const mem = process.memoryUsage();
    lines.push("# HELP nodejs_heap_used_bytes Process heap memory used.");
    lines.push("# TYPE nodejs_heap_used_bytes gauge");
    lines.push(`nodejs_heap_used_bytes ${mem.heapUsed}`);

    // Custom Counters
    for (const [key, val] of this.counters.entries()) {
      lines.push(`${key} ${val}`);
    }

    // Custom Gauges
    for (const [key, val] of this.gauges.entries()) {
      lines.push(`${key} ${val}`);
    }

    // Histograms
    for (const [key] of this.histograms.entries()) {
      const p = this.getHistogramPercentiles(key);
      const cleanKey = key.split("{")[0];
      lines.push(`${cleanKey}_p50 ${p.p50}`);
      lines.push(`${cleanKey}_p90 ${p.p90}`);
      lines.push(`${cleanKey}_p99 ${p.p99}`);
      lines.push(`${cleanKey}_count ${p.count}`);
    }

    return lines.join("\n") + "\n";
  }

  getMetricsSummary() {
    return {
      uptimeSeconds: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      httpDurations: this.getHistogramPercentiles("http_request_duration_ms"),
      checkDurations: this.getHistogramPercentiles("check_duration_ms"),
      counters: Object.fromEntries(this.counters),
    };
  }

  reset() {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

export const metrics = new MetricsRegistry();

/**
 * Measure execution time of an asynchronous function and record latency.
 */
export async function measureAsync<T>(
  metricName: string,
  fn: () => Promise<T>,
  labels?: Record<string, string>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    metrics.recordHistogram(metricName, duration, labels);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    metrics.recordHistogram(metricName, duration, { ...labels, error: "true" });
    throw error;
  }
}

import { appLogger } from "./logger";
import { metrics } from "./metrics";

export interface SystemAlertEvent {
  title: string;
  severity: "CRITICAL" | "HIGH" | "WARNING" | "INFO";
  component: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export class AlertManager {
  private static alertCooldowns: Map<string, number> = new Map();
  private static COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes per alert rule

  /**
   * Dispatch a system-level administrative alert.
   */
  static async triggerSystemAlert(event: Omit<SystemAlertEvent, "timestamp">): Promise<boolean> {
    const key = `${event.component}:${event.title}`;
    const now = Date.now();
    const lastTriggered = this.alertCooldowns.get(key) || 0;

    if (now - lastTriggered < this.COOLDOWN_MS) {
      appLogger.info(`[AlertManager] Suppressed duplicate alert during cooldown: ${event.title}`, {
        alertKey: key,
      });
      return false;
    }

    this.alertCooldowns.set(key, now);
    metrics.increment("system_alerts_total", 1, { severity: event.severity, component: event.component });

    const fullEvent: SystemAlertEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    appLogger.warn(`[System Alert] [${event.severity}] ${event.title} - ${event.message}`, {
      ...fullEvent,
    });

    // If an external webhook is configured for ops alerts (e.g. Discord, Slack, PagerDuty)
    const opsWebhookUrl = process.env.OPS_ALERT_WEBHOOK_URL;
    if (opsWebhookUrl) {
      try {
        await fetch(opsWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `🚨 **[${fullEvent.severity}] APIWatch System Alert**\n**Component:** ${fullEvent.component}\n**Title:** ${fullEvent.title}\n**Message:** ${fullEvent.message}\n**Time:** ${fullEvent.timestamp}`,
          }),
        });
      } catch (err) {
        appLogger.error("Failed to forward system alert to external ops webhook", {}, err);
      }
    }

    return true;
  }

  /**
   * Evaluate runtime health anomalies.
   */
  static evaluateRuntimeHealth(checks: {
    dbHealthy: boolean;
    redisHealthy: boolean;
    recent5xxCount: number;
    avgLatencyMs: number;
  }) {
    if (!checks.dbHealthy) {
      this.triggerSystemAlert({
        title: "Database Connectivity Lost",
        severity: "CRITICAL",
        component: "database",
        message: "PostgreSQL database failed healthcheck ping. Backend queries will fail.",
      });
    }

    if (!checks.redisHealthy) {
      this.triggerSystemAlert({
        title: "Redis Cache/Queue Disconnected",
        severity: "HIGH",
        component: "redis",
        message: "Redis connection failed. Background jobs and caching are falling back to local memory.",
      });
    }

    if (checks.recent5xxCount > 10) {
      this.triggerSystemAlert({
        title: "5xx Error Rate Spike Detected",
        severity: "HIGH",
        component: "http-api",
        message: `${checks.recent5xxCount} server errors recorded in recent requests window.`,
      });
    }

    if (checks.avgLatencyMs > 1500) {
      this.triggerSystemAlert({
        title: "High API Latency Degraded Performance",
        severity: "WARNING",
        component: "performance",
        message: `Average API latency reached ${checks.avgLatencyMs}ms (exceeds 1500ms threshold).`,
      });
    }
  }

  static clearCooldowns() {
    this.alertCooldowns.clear();
  }
}

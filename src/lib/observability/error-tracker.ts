import crypto from "crypto";
import { appLogger, LogContext } from "./logger";

export interface Breadcrumb {
  timestamp: string;
  category: "http" | "db" | "queue" | "auth" | "ui";
  message: string;
  level: "info" | "warn" | "error";
  data?: Record<string, unknown>;
}

export interface CapturedErrorEvent {
  id: string;
  fingerprint: string;
  name: string;
  message: string;
  stack?: string;
  context?: LogContext;
  breadcrumbs: Breadcrumb[];
  timestamp: string;
  count: number;
  environment: string;
}

class ErrorTracker {
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 25;
  private errorBuffer: Map<string, CapturedErrorEvent> = new Map();
  private maxBufferSize = 100;

  /**
   * Add a breadcrumb to aid post-mortem debugging.
   */
  addBreadcrumb(crumb: Omit<Breadcrumb, "timestamp">) {
    this.breadcrumbs.push({
      ...crumb,
      timestamp: new Date().toISOString(),
    });

    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Generates a deterministic hash for deduplicating similar errors.
   */
  private generateFingerprint(err: Error): string {
    const raw = `${err.name}:${err.message.slice(0, 100)}`;
    return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
  }

  /**
   * Capture and track an unhandled or handled exception.
   */
  captureException(err: Error | unknown, context?: LogContext): string {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    const fingerprint = this.generateFingerprint(errorObj);
    const eventId = `err_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

    const existing = this.errorBuffer.get(fingerprint);
    if (existing) {
      existing.count += 1;
      existing.timestamp = new Date().toISOString();
      if (context) {
        existing.context = { ...existing.context, ...context };
      }
      appLogger.error(`[Dedup x${existing.count}] ${errorObj.message}`, {
        ...context,
        fingerprint,
        eventId,
      }, errorObj);
      return existing.id;
    }

    const event: CapturedErrorEvent = {
      id: eventId,
      fingerprint,
      name: errorObj.name,
      message: errorObj.message,
      stack: errorObj.stack,
      context,
      breadcrumbs: [...this.breadcrumbs],
      timestamp: new Date().toISOString(),
      count: 1,
      environment: process.env.NODE_ENV || "development",
    };

    if (this.errorBuffer.size >= this.maxBufferSize) {
      const oldestKey = this.errorBuffer.keys().next().value;
      if (oldestKey) this.errorBuffer.delete(oldestKey);
    }

    this.errorBuffer.set(fingerprint, event);

    appLogger.error(errorObj.message, {
      ...context,
      fingerprint,
      eventId,
    }, errorObj);

    return eventId;
  }

  /**
   * Return recent captured errors for monitoring/diagnostic dashboards.
   */
  getRecentErrors(): CapturedErrorEvent[] {
    return Array.from(this.errorBuffer.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  clear() {
    this.errorBuffer.clear();
    this.breadcrumbs = [];
  }
}

export const errorTracker = new ErrorTracker();

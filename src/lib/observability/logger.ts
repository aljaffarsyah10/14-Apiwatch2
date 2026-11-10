import crypto from "crypto";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogContext {
  requestId?: string;
  traceId?: string;
  workspaceId?: string;
  userId?: string;
  endpointId?: string;
  service?: string;
  durationMs?: number;
  httpStatus?: number;
  path?: string;
  method?: string;
  [key: string]: unknown;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string | number;
  };
}

const SENSITIVE_KEY_REGEX = /password|secret|token|auth|cookie|key|credential|bearer|pass/i;

/**
 * Recursively redacts sensitive keys from log contexts to prevent PII/credential leakage.
 */
export function sanitizeLogData<T>(input: T): T {
  if (input === null || input === undefined) return input;
  if (typeof input !== "object") return input;

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeLogData(item)) as unknown as T;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input)) {
    if (SENSITIVE_KEY_REGEX.test(key) && typeof val === "string") {
      sanitized[key] = "[REDACTED]";
    } else if (typeof val === "object" && val !== null) {
      sanitized[key] = sanitizeLogData(val);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized as T;
}

export class Logger {
  private serviceName: string;

  constructor(serviceName: string = "apiwatch") {
    this.serviceName = serviceName;
  }

  private formatEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    err?: Error | unknown
  ): StructuredLogEntry {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      environment: process.env.NODE_ENV || "development",
      context: context ? sanitizeLogData(context) : undefined,
    };

    if (err instanceof Error) {
      entry.error = {
        name: err.name,
        message: err.message,
        stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
        code: (err as { code?: string | number }).code,
      };
    } else if (err && typeof err === "object") {
      entry.error = sanitizeLogData(err as Record<string, unknown>) as StructuredLogEntry["error"];
    }

    return entry;
  }

  private write(level: LogLevel, entry: StructuredLogEntry) {
    const serialized = JSON.stringify(entry);
    if (level === "error" || level === "fatal") {
      console.error(serialized);
    } else if (level === "warn") {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === "production" && process.env.LOG_LEVEL !== "debug") return;
    this.write("debug", this.formatEntry("debug", message, context));
  }

  info(message: string, context?: LogContext) {
    this.write("info", this.formatEntry("info", message, context));
  }

  warn(message: string, context?: LogContext, err?: Error | unknown) {
    this.write("warn", this.formatEntry("warn", message, context, err));
  }

  error(message: string, context?: LogContext, err?: Error | unknown) {
    this.write("error", this.formatEntry("error", message, context, err));
  }

  fatal(message: string, context?: LogContext, err?: Error | unknown) {
    this.write("fatal", this.formatEntry("fatal", message, context, err));
  }

  /**
   * Helper to create child logger with preset context (e.g. requestId).
   */
  withContext(baseContext: LogContext): Logger {
    const child = new Logger(this.serviceName);
    const wrapMethod = (fn: (msg: string, ctx?: LogContext, err?: unknown) => void) => {
      return (msg: string, ctx?: LogContext, err?: unknown) => {
        fn(msg, { ...baseContext, ...ctx }, err);
      };
    };

    child.debug = wrapMethod(this.debug.bind(this));
    child.info = wrapMethod(this.info.bind(this));
    child.warn = wrapMethod(this.warn.bind(this));
    child.error = wrapMethod(this.error.bind(this));
    child.fatal = wrapMethod(this.fatal.bind(this));

    return child;
  }

  static generateTraceId(): string {
    return `trc_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  }
}

export const appLogger = new Logger("apiwatch-web");
export const workerLogger = new Logger("apiwatch-worker");

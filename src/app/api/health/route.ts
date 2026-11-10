import { NextRequest, NextResponse } from "next/server";
import { DatabaseMonitor } from "@/lib/observability/db-monitor";
import { defaultRedis } from "@/lib/queue/redis";

export async function GET(request?: NextRequest) {
  const probe = request?.nextUrl?.searchParams?.get("probe");

  // 1. Kubernetes / Container Liveness Probe (Instant check that server is alive)
  if (probe === "live" || probe === "liveness") {
    return NextResponse.json({ status: "alive", uptimeSeconds: Math.floor(process.uptime()) }, { status: 200 });
  }

  // 2. Readiness Probe (Checks backend dependencies: DB & Redis)
  const dbHealth = await DatabaseMonitor.pingDatabase();

  let redisHealthy = false;
  let redisLatencyMs = 0;
  const redisStart = performance.now();
  try {
    const pong = await defaultRedis.ping();
    redisLatencyMs = Math.round(performance.now() - redisStart);
    redisHealthy = pong === "PONG";
  } catch {
    redisHealthy = false;
    redisLatencyMs = Math.round(performance.now() - redisStart);
  }

  const isHealthy = dbHealth.healthy && redisHealthy;
  const isDegraded = !isHealthy && (dbHealth.healthy || redisHealthy);

  const mem = process.memoryUsage();
  const payload = {
    status: isHealthy ? "healthy" : isDegraded ? "degraded" : "unhealthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    uptimeSeconds: Math.floor(process.uptime()),
    services: {
      database: dbHealth.healthy ? "connected" : "disconnected",
      redis: redisHealthy ? "connected" : "disconnected",
    },
    latency: {
      databaseMs: dbHealth.latencyMs,
      redisMs: redisLatencyMs,
    },
    system: {
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      rssMb: Math.round(mem.rss / 1024 / 1024),
    },
  };

  return NextResponse.json(payload, {
    status: isHealthy ? 200 : isDegraded ? 200 : 503,
  });
}

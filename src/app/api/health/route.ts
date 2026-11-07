import { NextResponse } from "next/server";
import db from "@/lib/db";
import { defaultRedis } from "@/lib/queue/redis";

export async function GET() {
  let dbHealthy = false;
  let redisHealthy = false;

  // Check Database
  try {
    await db.$queryRaw`SELECT 1`;
    dbHealthy = true;
  } catch {
    dbHealthy = false;
  }

  // Check Redis
  try {
    const pong = await defaultRedis.ping();
    redisHealthy = pong === "PONG";
  } catch {
    redisHealthy = false;
  }

  const isHealthy = dbHealthy && redisHealthy;
  const isDegraded = !isHealthy && (dbHealthy || redisHealthy);

  const payload = {
    status: isHealthy ? "healthy" : isDegraded ? "degraded" : "unhealthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    uptimeSeconds: Math.floor(process.uptime()),
    services: {
      database: dbHealthy ? "connected" : "disconnected",
      redis: redisHealthy ? "connected" : "disconnected",
    },
  };

  return NextResponse.json(payload, {
    status: isHealthy ? 200 : isDegraded ? 200 : 503,
  });
}

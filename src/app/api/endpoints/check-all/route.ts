import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionOrDefault } from "@/lib/auth/session";
import { MonitoringService } from "@/lib/services/monitoring.service";

export async function POST() {
  try {
    const session = await getSessionOrDefault();

    const endpoints = await db.endpoint.findMany({
      where: {
        workspaceId: session.workspaceId,
        isActive: true,
      },
      select: { id: true, name: true },
    });

    if (endpoints.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active endpoints to check",
        checkedCount: 0,
      });
    }

    // Execute checks in parallel with limit/settled handling
    const results = await Promise.allSettled(
      endpoints.map((ep) => MonitoringService.executeCheck(ep.id, true))
    );

    const successfulChecks = results.filter((r) => r.status === "fulfilled" && r.value !== null).length;

    return NextResponse.json({
      success: true,
      message: `Successfully executed health checks for ${successfulChecks} of ${endpoints.length} endpoints`,
      totalEndpoints: endpoints.length,
      checkedCount: successfulChecks,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[API POST /api/endpoints/check-all] Error:", errorMsg);
    return NextResponse.json(
      { success: false, error: "Failed to trigger batch health checks" },
      { status: 500 }
    );
  }
}

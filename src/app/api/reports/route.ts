import { NextResponse } from "next/server";
import { getSessionOrDefault } from "@/lib/auth/session";
import db from "@/lib/db";

export async function GET() {
  try {
    const session = await getSessionOrDefault();

    const endpoints = await db.endpoint.findMany({
      where: { workspaceId: session.workspaceId },
      include: {
        checks: {
          take: 100,
          orderBy: { checkedAt: "desc" },
          select: {
            status: true,
            statusCode: true,
            responseTimeMs: true,
            checkedAt: true,
          },
        },
      },
    });

    const reportData = endpoints.map((endpoint) => {
      const checks = endpoint.checks;
      const totalChecks = checks.length;
      const successfulChecks = checks.filter((c) => c.status === "SUCCESS").length;
      const uptimePercentage =
        totalChecks > 0 ? Number(((successfulChecks / totalChecks) * 100).toFixed(2)) : 100;

      const validLatencies = checks
        .map((c) => c.responseTimeMs)
        .filter((r): r is number => r !== null && r > 0);

      const avgResponseTime =
        validLatencies.length > 0
          ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
          : 0;

      return {
        id: endpoint.id,
        name: endpoint.name,
        url: endpoint.url,
        method: endpoint.method,
        status: endpoint.status,
        intervalSeconds: endpoint.intervalSeconds,
        totalChecks,
        successfulChecks,
        failedChecks: totalChecks - successfulChecks,
        uptimePercentage,
        avgResponseTime,
        lastCheckedAt: checks[0]?.checkedAt || null,
      };
    });

    const totalEndpoints = reportData.length;
    const overallUptime =
      totalEndpoints > 0
        ? Number(
            (
              reportData.reduce((acc, curr) => acc + curr.uptimePercentage, 0) / totalEndpoints
            ).toFixed(2)
          )
        : 100;

    const overallAvgLatency =
      totalEndpoints > 0
        ? Math.round(
            reportData.reduce((acc, curr) => acc + curr.avgResponseTime, 0) / totalEndpoints
          )
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        overallUptime,
        overallAvgLatency,
        totalEndpoints,
        endpoints: reportData,
      },
    });
  } catch (error) {
    console.error("[API GET /api/reports]", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

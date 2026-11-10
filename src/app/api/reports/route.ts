import { NextRequest, NextResponse } from "next/server";
import { getSessionOrDefault } from "@/lib/auth/session";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrDefault();
    const period = request.nextUrl.searchParams.get("period") || "30d";

    // Calculate cutoff timestamp based on period
    const now = Date.now();
    let sinceTime: Date;
    if (period === "24h") {
      sinceTime = new Date(now - 24 * 60 * 60 * 1000);
    } else if (period === "7d") {
      sinceTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
    } else {
      sinceTime = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }

    const endpoints = await db.endpoint.findMany({
      where: { workspaceId: session.workspaceId },
      include: {
        checks: {
          where: {
            checkedAt: { gte: sinceTime },
          },
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

    return NextResponse.json(
      {
        success: true,
        data: {
          period,
          overallUptime,
          overallAvgLatency,
          totalEndpoints,
          endpoints: reportData,
        },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=10, stale-while-revalidate=20",
        },
      }
    );
  } catch (error) {
    console.error("[API GET /api/reports]", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

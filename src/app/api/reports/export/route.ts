import { NextRequest, NextResponse } from "next/server";
import { getSessionOrDefault } from "@/lib/auth/session";
import db from "@/lib/db";
import { buildSafeCsv } from "@/lib/utils/csv";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrDefault();
    const period = request.nextUrl.searchParams.get("period") || "30d";

    // Determine timeframe
    let days = 30;
    if (period === "24h") days = 1;
    else if (period === "7d") days = 7;

    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const endpoints = await db.endpoint.findMany({
      where: { workspaceId: session.workspaceId },
      include: {
        checks: {
          where: { checkedAt: { gte: sinceDate } },
          orderBy: { checkedAt: "desc" },
          take: 500,
          select: {
            status: true,
            statusCode: true,
            responseTimeMs: true,
            checkedAt: true,
          },
        },
      },
    });

    const headers = [
      "Endpoint Name",
      "Method",
      "URL",
      "Current Status",
      "Interval (Sec)",
      "Total Evaluated",
      "Successful Checks",
      "Failed Checks",
      "Availability (Uptime %)",
      "Average Latency (ms)",
      "Last Checked",
    ];

    const rows = endpoints.map((ep) => {
      const checks = ep.checks;
      const total = checks.length;
      const successes = checks.filter((c) => c.status === "SUCCESS").length;
      const uptime = total > 0 ? ((successes / total) * 100).toFixed(2) : "100.00";

      const validLatencies = checks
        .map((c) => c.responseTimeMs)
        .filter((r): r is number => r !== null && r > 0);

      const avgLatency =
        validLatencies.length > 0
          ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
          : 0;

      const lastChecked = checks[0]?.checkedAt
        ? new Date(checks[0].checkedAt).toISOString()
        : "Never";

      return [
        ep.name,
        ep.method,
        ep.url,
        ep.status,
        ep.intervalSeconds,
        total,
        successes,
        total - successes,
        `${uptime}%`,
        avgLatency,
        lastChecked,
      ];
    });

    const csvData = buildSafeCsv(headers, rows);
    const filename = `apiwatch-monitoring-${period}-${new Date().toISOString().split("T")[0]}.csv`;

    return new Response(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[API GET /api/reports/export]", error);
    return NextResponse.json(
      { success: false, error: "Failed to export CSV report" },
      { status: 500 }
    );
  }
}

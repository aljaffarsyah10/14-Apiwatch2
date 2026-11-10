import { NextRequest, NextResponse } from "next/server";
import { metrics } from "@/lib/observability/metrics";

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format");

  if (format === "json") {
    return NextResponse.json(metrics.getMetricsSummary());
  }

  // Default: Prometheus text format
  const textOutput = metrics.toPrometheusFormat();
  return new NextResponse(textOutput, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
    },
  });
}

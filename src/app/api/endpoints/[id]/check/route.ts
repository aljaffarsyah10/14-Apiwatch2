import { NextRequest, NextResponse } from "next/server";
import { MonitoringService } from "@/lib/services/monitoring.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const checkRecord = await MonitoringService.executeCheck(id, true);
    if (!checkRecord) {
      return NextResponse.json(
        { success: false, error: "Endpoint not found or check skipped" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: checkRecord,
    });
  } catch (error) {
    console.error("[API POST /api/endpoints/:id/check]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

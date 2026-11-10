import { NextRequest, NextResponse } from "next/server";
import { MonitoringService } from "@/lib/services/monitoring.service";
import { getSessionOrDefault } from "@/lib/auth/session";
import db from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await getSessionOrDefault();

    const endpoint = await db.endpoint.findFirst({
      where: { id, workspaceId: session.workspaceId },
      select: { id: true },
    });

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: "Endpoint not found" },
        { status: 404 }
      );
    }

    const checkRecord = await MonitoringService.executeCheck(id, true);
    if (!checkRecord) {
      return NextResponse.json(
        { success: false, error: "Check skipped or endpoint not found" },
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

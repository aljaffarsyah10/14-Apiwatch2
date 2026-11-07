import { NextResponse } from "next/server";
import { DashboardService } from "@/lib/services/dashboard.service";
import { getOrCreateDefaultWorkspaceId } from "@/lib/services/workspace.helper";

export async function GET() {
  try {
    const workspaceId = await getOrCreateDefaultWorkspaceId();
    const summary = await DashboardService.getSummary(workspaceId);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("[API GET /api/dashboard/summary]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

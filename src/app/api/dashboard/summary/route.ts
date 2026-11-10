import { NextResponse } from "next/server";
import { DashboardService } from "@/lib/services/dashboard.service";
import { getSessionOrDefault } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSessionOrDefault();
    const summary = await DashboardService.getSummary(session.workspaceId);

    return NextResponse.json(
      {
        success: true,
        data: summary,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
        },
      }
    );
  } catch (error) {
    console.error("[API GET /api/dashboard/summary]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    const checks = await db.monitoringCheck.findMany({
      where: { endpointId: id },
      orderBy: { checkedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: checks,
    });
  } catch (error) {
    console.error("[API GET /api/endpoints/:id/history]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

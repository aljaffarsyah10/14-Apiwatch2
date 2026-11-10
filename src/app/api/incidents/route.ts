import { NextResponse } from "next/server";
import { getSessionOrDefault } from "@/lib/auth/session";
import db from "@/lib/db";

export async function GET() {
  try {
    const session = await getSessionOrDefault();

    const endpoints = await db.endpoint.findMany({
      where: { workspaceId: session.workspaceId },
      select: { id: true },
    });

    const endpointIds = endpoints.map((e) => e.id);

    const incidents = await db.incident.findMany({
      where: {
        endpointId: { in: endpointIds },
      },
      include: {
        endpoint: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
      take: 50,
    });

    return NextResponse.json(
      {
        success: true,
        data: incidents,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
        },
      }
    );
  } catch (error) {
    console.error("[API GET /api/incidents]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch incidents" },
      { status: 500 }
    );
  }
}

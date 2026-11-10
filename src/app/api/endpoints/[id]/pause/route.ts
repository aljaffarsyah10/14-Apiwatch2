import { NextRequest, NextResponse } from "next/server";
import { EndpointService } from "@/lib/services/endpoint.service";
import { getSessionOrDefault } from "@/lib/auth/session";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await getSessionOrDefault();

    const updated = await EndpointService.pauseEndpoint(id, session.workspaceId);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("[API POST /api/endpoints/:id/pause]", error);
    const isNotFound = error instanceof Error && error.message === "Endpoint not found";
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: isNotFound ? 404 : 500 }
    );
  }
}

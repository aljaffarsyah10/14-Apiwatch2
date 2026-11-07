import { NextRequest, NextResponse } from "next/server";
import { EndpointService } from "@/lib/services/endpoint.service";
import { getOrCreateDefaultWorkspaceId } from "@/lib/services/workspace.helper";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const workspaceId = await getOrCreateDefaultWorkspaceId();

    const updated = await EndpointService.resumeEndpoint(id, workspaceId);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("[API POST /api/endpoints/:id/resume]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { EndpointService } from "@/lib/services/endpoint.service";
import { getSessionOrDefault } from "@/lib/auth/session";
import { endpointFormSchema } from "@/lib/validations/endpoint.schema";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await getSessionOrDefault();

    const endpoint = await EndpointService.getEndpointById(id, session.workspaceId);
    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: "Endpoint not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: endpoint,
    });
  } catch (error) {
    console.error("[API GET /api/endpoints/:id]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await getSessionOrDefault();
    const body = await request.json();

    const parsed = endpointFormSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const updated = await EndpointService.updateEndpoint(id, parsed.data, session.workspaceId);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("[API PATCH /api/endpoints/:id]", error);
    const isNotFound = error instanceof Error && error.message === "Endpoint not found";
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: isNotFound ? 404 : 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await getSessionOrDefault();

    await EndpointService.deleteEndpoint(id, session.workspaceId);

    return NextResponse.json({
      success: true,
      message: "Endpoint deleted successfully",
    });
  } catch (error) {
    console.error("[API DELETE /api/endpoints/:id]", error);
    const isNotFound = error instanceof Error && error.message === "Endpoint not found";
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: isNotFound ? 404 : 500 }
    );
  }
}

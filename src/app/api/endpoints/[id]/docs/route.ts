import { NextRequest, NextResponse } from "next/server";
import { getSessionOrDefault } from "@/lib/auth/session";
import db from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await getSessionOrDefault();

    const endpoint = await db.endpoint.findFirst({
      where: { id, workspaceId: session.workspaceId },
      include: { documentation: true },
    });

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: "Endpoint not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: endpoint.documentation,
    });
  } catch (error) {
    console.error("[API GET /api/endpoints/:id/docs]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch documentation" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await getSessionOrDefault();
    const body = await request.json();
    const { description, requestExample, responseExample } = body;

    const endpoint = await db.endpoint.findFirst({
      where: { id, workspaceId: session.workspaceId },
    });

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: "Endpoint not found" },
        { status: 404 }
      );
    }

    const doc = await db.endpointDocumentation.upsert({
      where: { endpointId: id },
      create: {
        endpointId: id,
        description: description || null,
        requestExample: requestExample || null,
        responseExample: responseExample || null,
      },
      update: {
        description: description !== undefined ? description : undefined,
        requestExample: requestExample !== undefined ? requestExample : undefined,
        responseExample: responseExample !== undefined ? responseExample : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: doc,
    });
  } catch (error) {
    console.error("[API PUT /api/endpoints/:id/docs]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update documentation" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { EndpointService } from "@/lib/services/endpoint.service";
import { getSessionOrDefault } from "@/lib/auth/session";
import { endpointFormSchema } from "@/lib/validations/endpoint.schema";
import { EndpointStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrDefault();
    const workspaceId = session.workspaceId;
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const statusParam = searchParams.get("status") || "ALL";

    const endpoints = await EndpointService.listEndpoints(workspaceId, {
      search,
      status: statusParam as EndpointStatus | "ALL",
    });

    return NextResponse.json({
      success: true,
      data: endpoints,
    });
  } catch (error) {
    console.error("[API GET /api/endpoints]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch endpoints",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOrDefault();
    const workspaceId = session.workspaceId;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const parsed = endpointFormSchema.safeParse(body);
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

    const created = await EndpointService.createEndpoint(parsed.data, workspaceId);

    return NextResponse.json(
      {
        success: true,
        data: created,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API POST /api/endpoints]", error);
    const message = error instanceof Error ? error.message : "Failed to create endpoint";
    const status = message.includes("SSRF") || message.includes("prohibited") ? 400 : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSessionOrDefault } from "@/lib/auth/session";
import db from "@/lib/db";
import { EndpointStatus } from "@prisma/client";
import { scheduleEndpointCheck, triggerImmediateCheck } from "@/lib/queue/scheduler";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionOrDefault();
    const workspaceId = session.workspaceId;
    const { id } = await params;

    const sourceEndpoint = await db.endpoint.findFirst({
      where: {
        id,
        workspaceId,
      },
      include: {
        config: true,
      },
    });

    if (!sourceEndpoint) {
      return NextResponse.json(
        { success: false, error: "Source endpoint not found in current workspace" },
        { status: 404 }
      );
    }

    // Create cloned endpoint
    const cloned = await db.endpoint.create({
      data: {
        workspaceId,
        name: `${sourceEndpoint.name} (Copy)`,
        url: sourceEndpoint.url,
        method: sourceEndpoint.method,
        intervalSeconds: sourceEndpoint.intervalSeconds,
        timeoutMs: sourceEndpoint.timeoutMs,
        status: EndpointStatus.PENDING,
        config: sourceEndpoint.config
          ? {
              create: {
                expectedStatusCodes: sourceEndpoint.config.expectedStatusCodes,
                requestHeadersEncrypted: sourceEndpoint.config.requestHeadersEncrypted,
                requestBody: sourceEndpoint.config.requestBody,
                expectedBodyContains: sourceEndpoint.config.expectedBodyContains,
                expectedBodyNotContains: sourceEndpoint.config.expectedBodyNotContains,
                followRedirects: sourceEndpoint.config.followRedirects,
              },
            }
          : undefined,
      },
      include: {
        config: true,
      },
    });

    // Schedule check for the cloned endpoint
    await scheduleEndpointCheck(cloned.id, cloned.intervalSeconds);
    await triggerImmediateCheck(cloned.id);

    return NextResponse.json(
      {
        success: true,
        message: `Endpoint "${cloned.name}" created successfully.`,
        data: cloned,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API POST /api/endpoints/[id]/clone]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to clone endpoint",
      },
      { status: 500 }
    );
  }
}

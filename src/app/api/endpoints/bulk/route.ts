import { NextRequest, NextResponse } from "next/server";
import { getSessionOrDefault } from "@/lib/auth/session";
import db from "@/lib/db";
import { EndpointStatus } from "@prisma/client";
import {
  scheduleEndpointCheck,
  removeEndpointSchedule,
  triggerImmediateCheck,
} from "@/lib/queue/scheduler";

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

    const { action, ids } = body;

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid action or empty endpoint IDs list" },
        { status: 400 }
      );
    }

    if (!["pause", "resume", "check", "delete"].includes(action)) {
      return NextResponse.json(
        { success: false, error: `Unsupported bulk action: ${action}` },
        { status: 400 }
      );
    }

    // Verify workspace ownership for all requested IDs
    const ownedEndpoints = await db.endpoint.findMany({
      where: {
        id: { in: ids },
        workspaceId,
      },
      select: {
        id: true,
        name: true,
        status: true,
        intervalSeconds: true,
      },
    });

    const ownedIds = ownedEndpoints.map((e) => e.id);

    if (ownedIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No matching endpoints found in workspace" },
        { status: 404 }
      );
    }

    switch (action) {
      case "pause": {
        // Remove from scheduler and set status to PAUSED
        await Promise.all(ownedIds.map((id) => removeEndpointSchedule(id)));
        await db.endpoint.updateMany({
          where: { id: { in: ownedIds } },
          data: { status: EndpointStatus.PAUSED },
        });
        return NextResponse.json({
          success: true,
          message: `Paused ${ownedIds.length} endpoint(s).`,
          affectedCount: ownedIds.length,
        });
      }

      case "resume": {
        // Reschedule and trigger immediate check for each
        for (const ep of ownedEndpoints) {
          const interval = ep.intervalSeconds || 60;
          await scheduleEndpointCheck(ep.id, interval);
          await triggerImmediateCheck(ep.id);
        }
        await db.endpoint.updateMany({
          where: { id: { in: ownedIds } },
          data: { status: EndpointStatus.PENDING },
        });
        return NextResponse.json({
          success: true,
          message: `Resumed and queued checks for ${ownedIds.length} endpoint(s).`,
          affectedCount: ownedIds.length,
        });
      }

      case "check": {
        // Trigger immediate check for all selected endpoints
        for (const id of ownedIds) {
          await triggerImmediateCheck(id);
        }
        return NextResponse.json({
          success: true,
          message: `Dispatched real-time checks for ${ownedIds.length} endpoint(s).`,
          affectedCount: ownedIds.length,
        });
      }

      case "delete": {
        // Remove schedules and delete database records
        await Promise.all(ownedIds.map((id) => removeEndpointSchedule(id)));
        await db.endpoint.deleteMany({
          where: { id: { in: ownedIds } },
        });
        return NextResponse.json({
          success: true,
          message: `Permanently deleted ${ownedIds.length} endpoint(s).`,
          affectedCount: ownedIds.length,
        });
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API POST /api/endpoints/bulk]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to execute bulk action",
      },
      { status: 500 }
    );
  }
}

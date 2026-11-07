import { NextRequest, NextResponse } from "next/server";
import { getSessionOrDefault } from "@/lib/auth/session";
import db from "@/lib/db";

export async function GET() {
  try {
    const session = await getSessionOrDefault();
    const settings = await db.notificationSetting.findMany({
      where: { workspaceId: session.workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("[API GET /api/settings/notifications]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notification settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOrDefault();
    const body = await request.json();
    const { email, enabled = true } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email is required" },
        { status: 400 }
      );
    }

    // Upsert or create notification setting
    const existing = await db.notificationSetting.findFirst({
      where: {
        workspaceId: session.workspaceId,
        email: email.toLowerCase(),
      },
    });

    let setting;
    if (existing) {
      setting = await db.notificationSetting.update({
        where: { id: existing.id },
        data: { enabled },
      });
    } else {
      setting = await db.notificationSetting.create({
        data: {
          workspaceId: session.workspaceId,
          email: email.toLowerCase(),
          enabled,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: setting,
    });
  } catch (error) {
    console.error("[API POST /api/settings/notifications]", error);
    return NextResponse.json(
      { success: false, error: "Failed to save notification settings" },
      { status: 500 }
    );
  }
}

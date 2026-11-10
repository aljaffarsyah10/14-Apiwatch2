import { NextResponse } from "next/server";
import { getSessionOrDefault } from "@/lib/auth/session";
import db from "@/lib/db";

export async function GET() {
  try {
    const session = await getSessionOrDefault();
    const workspace = await db.workspace.findUnique({
      where: { id: session.workspaceId },
      select: { onboardingCompleted: true, name: true },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      data: {
        completed: workspace?.onboardingCompleted ?? true,
        workspaceName: workspace?.name ?? "My Workspace",
      },
    });
  } catch (error) {
    console.error("[API GET /api/onboarding/status]", error);
    return NextResponse.json(
      { success: false, error: "Failed to load onboarding status" },
      { status: 500 }
    );
  }
}

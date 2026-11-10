import { NextResponse } from "next/server";
import { getSessionOrDefault } from "@/lib/auth/session";
import db from "@/lib/db";

export async function POST() {
  try {
    const session = await getSessionOrDefault();

    await db.workspace.update({
      where: { id: session.workspaceId },
      data: { onboardingCompleted: true },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
    });
  } catch (error) {
    console.error("[API POST /api/onboarding/complete]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update onboarding state" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getSessionOrDefault } from "@/lib/auth/session";
import { BillingGateway } from "@/lib/billing/billing-gateway";

export async function POST() {
  try {
    const session = await getSessionOrDefault();
    const updated = await BillingGateway.resumeSubscription(session.workspaceId);

    return NextResponse.json({
      success: true,
      message: "Subscription renewal has been resumed",
      data: updated,
    });
  } catch (error) {
    console.error("[API POST /api/billing/resume]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to resume subscription" },
      { status: 500 }
    );
  }
}

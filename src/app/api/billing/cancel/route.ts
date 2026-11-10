import { NextResponse } from "next/server";
import { getSessionOrDefault } from "@/lib/auth/session";
import { BillingGateway } from "@/lib/billing/billing-gateway";

export async function POST() {
  try {
    const session = await getSessionOrDefault();
    const updated = await BillingGateway.cancelSubscription(session.workspaceId);

    return NextResponse.json({
      success: true,
      message: "Subscription will cancel at the end of the current billing period",
      data: updated,
    });
  } catch (error) {
    console.error("[API POST /api/billing/cancel]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}

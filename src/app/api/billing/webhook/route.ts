import { NextRequest, NextResponse } from "next/server";
import { BillingGateway } from "@/lib/billing/billing-gateway";
import { SubscriptionTier, BillingCycle } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    const { event, data } = body;

    // Handle Sandbox Simulation or real Webhook Event
    if (event === "checkout.session.completed" || event === "sandbox.simulate.payment") {
      const workspaceId = data?.workspaceId;
      const tier: SubscriptionTier = data?.tier || "PRO";
      const cycle: BillingCycle = data?.cycle === "ANNUAL" ? "ANNUAL" : "MONTHLY";

      if (!workspaceId) {
        return NextResponse.json(
          { success: false, error: "Missing workspaceId in payment event" },
          { status: 400 }
        );
      }

      const updatedSub = await BillingGateway.activateSubscription({
        workspaceId,
        tier,
        cycle,
        stripeCustomerId: data?.customerId,
        stripeSubscriptionId: data?.subscriptionId,
      });

      return NextResponse.json({
        success: true,
        message: "Payment processed and subscription activated successfully",
        data: updatedSub,
      });
    }

    return NextResponse.json({
      received: true,
      message: `Event '${event}' acknowledged`,
    });
  } catch (error) {
    console.error("[API POST /api/billing/webhook]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 }
    );
  }
}

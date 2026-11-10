import { NextRequest, NextResponse } from "next/server";
import { getSessionOrDefault } from "@/lib/auth/session";
import { BillingGateway } from "@/lib/billing/billing-gateway";
import { SubscriptionTier, BillingCycle } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOrDefault();
    const workspaceId = session.workspaceId;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    const { tier, cycle = "MONTHLY" } = body;

    if (!tier || !["PRO", "ENTERPRISE"].includes(tier)) {
      return NextResponse.json(
        { success: false, error: "Valid paid tier ('PRO' or 'ENTERPRISE') is required" },
        { status: 400 }
      );
    }

    const validCycle: BillingCycle = cycle === "ANNUAL" ? "ANNUAL" : "MONTHLY";

    const origin = request.nextUrl.origin || "http://localhost:3000";
    const sessionResult = await BillingGateway.createCheckoutSession({
      workspaceId,
      userEmail: session.email,
      tier: tier as SubscriptionTier,
      cycle: validCycle,
      successUrl: `${origin}/settings?tab=billing&payment=success`,
      cancelUrl: `${origin}/settings?tab=billing&payment=canceled`,
    });

    return NextResponse.json({
      success: true,
      data: sessionResult,
    });
  } catch (error) {
    console.error("[API POST /api/billing/checkout]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to initiate checkout" },
      { status: 500 }
    );
  }
}

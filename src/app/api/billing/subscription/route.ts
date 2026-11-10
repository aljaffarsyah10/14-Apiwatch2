import { NextResponse } from "next/server";
import { getSessionOrDefault } from "@/lib/auth/session";
import { UsageLimitsService } from "@/lib/services/usage-limits.service";
import { BillingGateway } from "@/lib/billing/billing-gateway";

export async function GET() {
  try {
    const session = await getSessionOrDefault();
    const workspaceId = session.workspaceId;

    const [usage, invoices] = await Promise.all([
      UsageLimitsService.getWorkspaceUsage(workspaceId),
      BillingGateway.getWorkspaceInvoices(workspaceId).catch(() => []),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        usage,
        invoices,
        isSandbox: BillingGateway.isSandbox(),
      },
    });
  } catch (error) {
    console.error("[API GET /api/billing/subscription]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load subscription data" },
      { status: 500 }
    );
  }
}

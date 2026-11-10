import { NextResponse } from "next/server";
import { getSessionOrDefault } from "@/lib/auth/session";
import { BillingGateway } from "@/lib/billing/billing-gateway";

export async function GET() {
  try {
    const session = await getSessionOrDefault();
    const invoices = await BillingGateway.getWorkspaceInvoices(session.workspaceId);

    return NextResponse.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error("[API GET /api/billing/invoices]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load invoices" },
      { status: 500 }
    );
  }
}

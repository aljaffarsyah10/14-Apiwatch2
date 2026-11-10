import db from "../db";
import { SubscriptionTier, SubscriptionStatus, BillingCycle, InvoiceStatus } from "@prisma/client";
import { SUBSCRIPTION_PLANS } from "./plans";
import crypto from "crypto";

export interface CheckoutSessionOptions {
  workspaceId: string;
  userEmail: string;
  tier: SubscriptionTier;
  cycle: BillingCycle;
  successUrl: string;
  cancelUrl: string;
}

export class BillingGateway {
  static isSandbox(): boolean {
    return process.env.BILLING_SANDBOX_MODE !== "false";
  }

  /**
   * Create checkout session for subscription upgrade.
   * In sandbox mode, produces an immediate simulated checkout link.
   */
  static async createCheckoutSession(options: CheckoutSessionOptions) {
    const { workspaceId, userEmail, tier, cycle, successUrl } = options;
    const plan = SUBSCRIPTION_PLANS[tier];
    if (!plan || tier === "FREE") {
      throw new Error("Invalid subscription plan tier for checkout");
    }

    const priceCents = cycle === "ANNUAL" ? plan.priceAnnualCents : plan.priceMonthlyCents;
    const sessionId = `cs_sandbox_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    if (this.isSandbox()) {
      // In sandbox mode, provide an internal sandbox redirect or simulate instant upgrade
      const sandboxUrl = `${successUrl}?session_id=${sessionId}&sandbox=true&tier=${tier}&cycle=${cycle}`;

      return {
        sessionId,
        checkoutUrl: sandboxUrl,
        mode: "sandbox",
        tier,
        cycle,
        amountCents: priceCents,
        userEmail,
        workspaceId,
      };
    }

    // In production Stripe mode:
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // return await stripe.checkout.sessions.create(...);
    throw new Error("Production payment keys not configured. Please use Sandbox mode.");
  }

  /**
   * Complete payment and activate or extend subscription.
   */
  static async activateSubscription(params: {
    workspaceId: string;
    tier: SubscriptionTier;
    cycle: BillingCycle;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  }) {
    const { workspaceId, tier, cycle, stripeCustomerId, stripeSubscriptionId } = params;
    const plan = SUBSCRIPTION_PLANS[tier];
    const durationDays = cycle === "ANNUAL" ? 365 : 30;
    const periodEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    // Upsert subscription
    const sub = await db.subscription.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        tier,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: cycle,
        trialEndsAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        stripeCustomerId: stripeCustomerId || `cus_sandbox_${workspaceId.slice(0, 8)}`,
        stripeSubscriptionId: stripeSubscriptionId || `sub_sandbox_${Date.now()}`,
      },
      update: {
        tier,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: cycle,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
    });

    // Create corresponding paid invoice
    const amountCents = cycle === "ANNUAL" ? plan.priceAnnualCents : plan.priceMonthlyCents;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await db.invoice.create({
      data: {
        workspaceId,
        invoiceNumber,
        amountPaid: amountCents,
        currency: "USD",
        status: InvoiceStatus.PAID,
        billingReason: "subscription_create",
        periodStart: new Date(),
        periodEnd,
        hostedUrl: `/api/billing/invoices/${invoiceNumber}`,
      },
    });

    return sub;
  }

  /**
   * Cancel subscription at current period end.
   */
  static async cancelSubscription(workspaceId: string) {
    const sub = await db.subscription.findUnique({
      where: { workspaceId },
    });

    if (!sub) {
      throw new Error("No active subscription found for this workspace");
    }

    return db.subscription.update({
      where: { workspaceId },
      data: {
        cancelAtPeriodEnd: true,
      },
    });
  }

  /**
   * Resume subscription that was marked to cancel.
   */
  static async resumeSubscription(workspaceId: string) {
    return db.subscription.update({
      where: { workspaceId },
      data: {
        cancelAtPeriodEnd: false,
      },
    });
  }

  /**
   * Fetch invoice history for a workspace.
   */
  static async getWorkspaceInvoices(workspaceId: string) {
    return db.invoice.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
  }
}

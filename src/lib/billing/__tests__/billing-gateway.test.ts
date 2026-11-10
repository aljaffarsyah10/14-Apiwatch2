import { describe, it, expect, vi, beforeEach } from "vitest";
import { BillingGateway } from "../billing-gateway";
import db from "@/lib/db";
import { SubscriptionTier, SubscriptionStatus, InvoiceStatus } from "@prisma/client";

vi.mock("@/lib/db", () => ({
  default: {
    subscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    invoice: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("BillingGateway & Sandbox Payment Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Checkout Session Generation", () => {
    it("creates a valid sandbox checkout session with simulated URL", async () => {
      const session = await BillingGateway.createCheckoutSession({
        workspaceId: "ws_test_billing",
        userEmail: "founder@startup.test",
        tier: SubscriptionTier.PRO,
        cycle: "MONTHLY",
        successUrl: "http://localhost:3000/settings?payment=success",
        cancelUrl: "http://localhost:3000/settings?payment=canceled",
      });

      expect(session.mode).toBe("sandbox");
      expect(session.sessionId).toContain("cs_sandbox_");
      expect(session.checkoutUrl).toContain("session_id=");
      expect(session.amountCents).toBe(1900); // $19.00
      expect(session.tier).toBe("PRO");
    });

    it("rejects checkout requests for the FREE plan tier", async () => {
      await expect(
        BillingGateway.createCheckoutSession({
          workspaceId: "ws_test",
          userEmail: "test@test.com",
          tier: SubscriptionTier.FREE,
          cycle: "MONTHLY",
          successUrl: "http://localhost:3000/success",
          cancelUrl: "http://localhost:3000/cancel",
        })
      ).rejects.toThrow("Invalid subscription plan tier for checkout");
    });
  });

  describe("Subscription Activation & Invoicing", () => {
    it("activates subscription and creates a corresponding paid invoice", async () => {
      const mockSub = {
        id: "sub_123",
        workspaceId: "ws_test_act",
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: "MONTHLY" as const,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        stripeCustomerId: "cus_sandbox_1",
        stripeSubscriptionId: "sub_sandbox_1",
        trialEndsAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.subscription.upsert).mockResolvedValueOnce(mockSub);
      vi.mocked(db.invoice.create).mockResolvedValueOnce({
        id: "inv_1",
        workspaceId: "ws_test_act",
        invoiceNumber: "INV-2026-1234",
        amountPaid: 1900,
        currency: "USD",
        status: InvoiceStatus.PAID,
        billingReason: "subscription_create",
        periodStart: new Date(),
        periodEnd: new Date(),
        hostedUrl: "/api/billing/invoices/INV-2026-1234",
        pdfUrl: null,
        createdAt: new Date(),
      });

      const result = await BillingGateway.activateSubscription({
        workspaceId: "ws_test_act",
        tier: SubscriptionTier.PRO,
        cycle: "MONTHLY",
      });

      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(db.subscription.upsert).toHaveBeenCalled();
      expect(db.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: "ws_test_act",
            amountPaid: 1900,
            currency: "USD",
            status: InvoiceStatus.PAID,
          }),
        })
      );
    });
  });

  describe("Subscription Cancellation & Resumption Lifecycle", () => {
    it("toggles cancelAtPeriodEnd flag on cancellation and resumption", async () => {
      vi.mocked(db.subscription.findUnique).mockResolvedValueOnce({
        id: "sub_canceling",
        workspaceId: "ws_active",
        status: SubscriptionStatus.ACTIVE,
      } as never);

      vi.mocked(db.subscription.update).mockResolvedValueOnce({
        id: "sub_canceling",
        workspaceId: "ws_active",
        cancelAtPeriodEnd: true,
      } as never);

      const canceled = await BillingGateway.cancelSubscription("ws_active");
      expect(canceled.cancelAtPeriodEnd).toBe(true);

      vi.mocked(db.subscription.update).mockResolvedValueOnce({
        id: "sub_canceling",
        workspaceId: "ws_active",
        cancelAtPeriodEnd: false,
      } as never);

      const resumed = await BillingGateway.resumeSubscription("ws_active");
      expect(resumed.cancelAtPeriodEnd).toBe(false);
    });
  });

  describe("Tenant Isolation for Invoices", () => {
    it("strictly scopes invoice queries by workspaceId", async () => {
      vi.mocked(db.invoice.findMany).mockResolvedValueOnce([
        {
          id: "inv_tenant_1",
          workspaceId: "ws_target",
          invoiceNumber: "INV-2026-5544",
          amountPaid: 1900,
          currency: "USD",
          status: InvoiceStatus.PAID,
          billingReason: "subscription_create",
          periodStart: new Date(),
          periodEnd: new Date(),
          hostedUrl: null,
          pdfUrl: null,
          createdAt: new Date(),
        },
      ]);

      const invoices = await BillingGateway.getWorkspaceInvoices("ws_target");
      expect(invoices.length).toBe(1);
      expect(db.invoice.findMany).toHaveBeenCalledWith({
        where: { workspaceId: "ws_target" },
        orderBy: { createdAt: "desc" },
      });
    });
  });
});

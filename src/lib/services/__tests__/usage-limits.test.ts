import { describe, it, expect, vi, beforeEach } from "vitest";
import { UsageLimitsService, QuotaExceededError } from "../usage-limits.service";
import db from "@/lib/db";
import { SubscriptionTier, SubscriptionStatus } from "@prisma/client";

vi.mock("@/lib/db", () => ({
  default: {
    subscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    endpoint: {
      count: vi.fn(),
    },
  },
}));

describe("UsageLimitsService & Quota Enforcement Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Endpoint Creation Quota Limits", () => {
    it("allows endpoint creation when current count is below plan limit", async () => {
      vi.mocked(db.subscription.findUnique).mockResolvedValueOnce({
        id: "sub_1",
        workspaceId: "ws_alpha",
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: "MONTHLY",
        trialEndsAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // FREE limit is 5; currently has 3 active
      vi.mocked(db.endpoint.count).mockResolvedValueOnce(3);

      await expect(
        UsageLimitsService.assertCanCreateEndpoint("ws_alpha")
      ).resolves.not.toThrow();
    });

    it("throws QuotaExceededError (HTTP 402) when endpoint limit is reached", async () => {
      vi.mocked(db.subscription.findUnique).mockResolvedValueOnce({
        id: "sub_1",
        workspaceId: "ws_alpha",
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: "MONTHLY",
        trialEndsAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // FREE limit is 5; currently has 5 active
      vi.mocked(db.endpoint.count).mockResolvedValueOnce(5);

      await expect(
        UsageLimitsService.assertCanCreateEndpoint("ws_alpha")
      ).rejects.toThrowError(QuotaExceededError);

      try {
        vi.mocked(db.subscription.findUnique).mockResolvedValueOnce({
          id: "sub_1",
          workspaceId: "ws_alpha",
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.ACTIVE,
          billingCycle: "MONTHLY",
          trialEndsAt: null,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          cancelAtPeriodEnd: false,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        vi.mocked(db.endpoint.count).mockResolvedValueOnce(5);
        await UsageLimitsService.assertCanCreateEndpoint("ws_alpha");
      } catch (err: unknown) {
        const qErr = err as QuotaExceededError;
        expect(qErr.statusCode).toBe(402);
        expect(qErr.code).toBe("ENDPOINT_LIMIT_REACHED");
        expect(qErr.limitValue).toBe(5);
        expect(qErr.currentValue).toBe(5);
        expect(qErr.suggestedTier).toBe("PRO");
      }
    });
  });

  describe("Interval Bounds Enforcement", () => {
    it("rejects intervals faster than allowed by the plan", async () => {
      vi.mocked(db.subscription.findUnique).mockResolvedValueOnce({
        id: "sub_1",
        workspaceId: "ws_free",
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: "MONTHLY",
        trialEndsAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // FREE minimum interval is 300s (5 min). Requesting 60s should fail
      await expect(
        UsageLimitsService.assertValidInterval("ws_free", 60)
      ).rejects.toThrowError(QuotaExceededError);
    });

    it("accepts valid intervals for higher tiers", async () => {
      vi.mocked(db.subscription.findUnique).mockResolvedValueOnce({
        id: "sub_pro",
        workspaceId: "ws_pro",
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: "MONTHLY",
        trialEndsAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // PRO allows 60s
      await expect(
        UsageLimitsService.assertValidInterval("ws_pro", 60)
      ).resolves.not.toThrow();
    });
  });

  describe("Free Trial & Expiration Logic", () => {
    it("automatically provisions 14-day PRO trial for new workspaces", async () => {
      vi.mocked(db.subscription.findUnique).mockResolvedValueOnce(null);
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      vi.mocked(db.subscription.create).mockResolvedValueOnce({
        id: "sub_new_trial",
        workspaceId: "ws_brand_new",
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.TRIALING,
        billingCycle: "MONTHLY",
        trialEndsAt: trialEnd,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEnd,
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const sub = await UsageLimitsService.getWorkspaceSubscription("ws_brand_new");
      expect(sub.status).toBe(SubscriptionStatus.TRIALING);
      expect(sub.tier).toBe(SubscriptionTier.PRO);
      expect(db.subscription.create).toHaveBeenCalled();
    });

    it("downgrades expired trials to FREE tier", async () => {
      const pastTrialEnd = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      vi.mocked(db.subscription.findUnique).mockResolvedValueOnce({
        id: "sub_expired_trial",
        workspaceId: "ws_old_trial",
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.TRIALING,
        billingCycle: "MONTHLY",
        trialEndsAt: pastTrialEnd,
        currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: pastTrialEnd,
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(db.subscription.update).mockResolvedValueOnce({
        id: "sub_expired_trial",
        workspaceId: "ws_old_trial",
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.EXPIRED,
        billingCycle: "MONTHLY",
        trialEndsAt: pastTrialEnd,
        currentPeriodStart: new Date(),
        currentPeriodEnd: pastTrialEnd,
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const sub = await UsageLimitsService.getWorkspaceSubscription("ws_old_trial");
      expect(sub.tier).toBe(SubscriptionTier.FREE);
      expect(sub.status).toBe(SubscriptionStatus.EXPIRED);
      expect(db.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { tier: SubscriptionTier.FREE, status: SubscriptionStatus.EXPIRED },
        })
      );
    });
  });
});

import { describe, it, expect } from "vitest";
import { SUBSCRIPTION_PLANS, getPlanConfig, formatPrice } from "../plans";
import { SubscriptionTier } from "@prisma/client";

describe("Subscription Plans & Pricing Models (SaaS Billing)", () => {
  it("defines comprehensive limits for all tiers (FREE, PRO, ENTERPRISE)", () => {
    const tiers: SubscriptionTier[] = ["FREE", "PRO", "ENTERPRISE"];

    for (const tier of tiers) {
      const plan = SUBSCRIPTION_PLANS[tier];
      expect(plan).toBeDefined();
      expect(plan.name).toBeTypeOf("string");
      expect(plan.maxEndpoints).toBeGreaterThan(0);
      expect(plan.minIntervalSeconds).toBeGreaterThan(0);
      expect(plan.retentionDays).toBeGreaterThan(0);
      expect(plan.maxManualChecksPerHour).toBeGreaterThan(0);
    }
  });

  it("enforces plan tier hierarchy for endpoint quotas and intervals", () => {
    const free = SUBSCRIPTION_PLANS.FREE;
    const pro = SUBSCRIPTION_PLANS.PRO;
    const ent = SUBSCRIPTION_PLANS.ENTERPRISE;

    // Endpoints quota escalates: Free (5) < Pro (50) < Enterprise (500)
    expect(free.maxEndpoints).toBeLessThan(pro.maxEndpoints);
    expect(pro.maxEndpoints).toBeLessThan(ent.maxEndpoints);

    // Monitoring intervals become faster: Free (300s) > Pro (60s) > Enterprise (10s)
    expect(free.minIntervalSeconds).toBeGreaterThan(pro.minIntervalSeconds);
    expect(pro.minIntervalSeconds).toBeGreaterThan(ent.minIntervalSeconds);

    // History retention increases: Free (1 day) < Pro (30 days) < Enterprise (365 days)
    expect(free.retentionDays).toBeLessThan(pro.retentionDays);
    expect(pro.retentionDays).toBeLessThan(ent.retentionDays);
  });

  it("correctly enables premium features exclusively on paid tiers", () => {
    expect(SUBSCRIPTION_PLANS.FREE.features.sslMonitoring).toBe(false);
    expect(SUBSCRIPTION_PLANS.PRO.features.sslMonitoring).toBe(true);
    expect(SUBSCRIPTION_PLANS.ENTERPRISE.features.sslMonitoring).toBe(true);

    expect(SUBSCRIPTION_PLANS.FREE.features.webhookAlerts).toBe(false);
    expect(SUBSCRIPTION_PLANS.PRO.features.webhookAlerts).toBe(true);

    expect(SUBSCRIPTION_PLANS.ENTERPRISE.features.dedicatedSupport).toBe(true);
  });

  it("formats monthly and annual prices accurately", () => {
    expect(formatPrice(0, "MONTHLY")).toBe("$0");
    expect(formatPrice(1900, "MONTHLY")).toBe("$19/mo");
    expect(formatPrice(19000, "ANNUAL")).toBe("$190/yr");
    expect(formatPrice(9900, "MONTHLY")).toBe("$99/mo");
    expect(formatPrice(99000, "ANNUAL")).toBe("$990/yr");
  });

  it("safely falls back to FREE plan for unknown or undefined tier queries", () => {
    const fallback = getPlanConfig("UNKNOWN_TIER" as unknown as SubscriptionTier);
    expect(fallback.tier).toBe("FREE");
    expect(fallback.maxEndpoints).toBe(5);
  });
});

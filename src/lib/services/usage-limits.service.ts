import db from "../db";
import { SubscriptionTier, SubscriptionStatus } from "@prisma/client";
import { getPlanConfig, PlanLimits, FREE_TRIAL_DURATION_DAYS } from "../billing/plans";
import { CacheManager } from "../cache/cache-manager";

export class QuotaExceededError extends Error {
  code: string;
  statusCode: number;
  currentValue: number;
  limitValue: number;
  suggestedTier: SubscriptionTier;

  constructor(
    message: string,
    code: string,
    currentValue: number,
    limitValue: number,
    suggestedTier: SubscriptionTier = "PRO"
  ) {
    super(message);
    this.name = "QuotaExceededError";
    this.code = code;
    this.statusCode = 402; // Payment Required
    this.currentValue = currentValue;
    this.limitValue = limitValue;
    this.suggestedTier = suggestedTier;
  }
}

export interface WorkspaceUsageSummary {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  planName: string;
  isTrial: boolean;
  trialDaysRemaining: number;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  endpoints: {
    used: number;
    max: number;
    percent: number;
  };
  intervalSeconds: {
    minAllowed: number;
  };
  retentionDays: number;
  features: PlanLimits["features"];
}

export class UsageLimitsService {
  /**
   * Fetch active subscription or default to Free with 14-day Pro Trial for new workspaces.
   */
  static async getWorkspaceSubscription(workspaceId: string) {
    try {
      let sub = await db.subscription.findUnique({
        where: { workspaceId },
      });

      // If no subscription record exists yet, automatically initialize 14-day PRO trial
      if (!sub) {
        const trialEnd = new Date(Date.now() + FREE_TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
        sub = await db.subscription.create({
          data: {
            workspaceId,
            tier: SubscriptionTier.PRO,
            status: SubscriptionStatus.TRIALING,
            trialEndsAt: trialEnd,
            currentPeriodStart: new Date(),
            currentPeriodEnd: trialEnd,
          },
        });
      }

      // Check if trial has expired
      if (
        sub.status === SubscriptionStatus.TRIALING &&
        sub.trialEndsAt &&
        new Date() > sub.trialEndsAt
      ) {
        // Expired trial downgrades to FREE
        sub = await db.subscription.update({
          where: { id: sub.id },
          data: {
            tier: SubscriptionTier.FREE,
            status: SubscriptionStatus.EXPIRED,
          },
        });
      }

      return sub;
    } catch (error) {
      console.warn("[UsageLimitsService] DB query failed or table not ready, using fallback:", error);
      // Safe fallback if DB is undergoing migration or offline
      return {
        id: "sub_fallback",
        workspaceId,
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.TRIALING,
        billingCycle: "MONTHLY" as const,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      };
    }
  }

  /**
   * Asserts whether the workspace can create a new endpoint under its plan quota.
   */
  static async assertCanCreateEndpoint(workspaceId: string): Promise<void> {
    const sub = await this.getWorkspaceSubscription(workspaceId);
    const plan = getPlanConfig(sub.tier);

    const currentCount = await db.endpoint.count({
      where: { workspaceId, isActive: true },
    }).catch(() => 0);

    if (currentCount >= plan.maxEndpoints) {
      throw new QuotaExceededError(
        `Endpoint limit reached (${currentCount}/${plan.maxEndpoints}). Upgrade your plan to monitor more endpoints.`,
        "ENDPOINT_LIMIT_REACHED",
        currentCount,
        plan.maxEndpoints,
        sub.tier === "FREE" ? "PRO" : "ENTERPRISE"
      );
    }
  }

  /**
   * Asserts whether requested check interval is allowed for the workspace tier.
   */
  static async assertValidInterval(workspaceId: string, requestedIntervalSeconds: number): Promise<void> {
    const sub = await this.getWorkspaceSubscription(workspaceId);
    const plan = getPlanConfig(sub.tier);

    if (requestedIntervalSeconds < plan.minIntervalSeconds) {
      throw new QuotaExceededError(
        `Minimum check interval on the ${plan.name} plan is ${plan.minIntervalSeconds}s. Upgrade to access faster intervals.`,
        "INTERVAL_TOO_FAST",
        requestedIntervalSeconds,
        plan.minIntervalSeconds,
        sub.tier === "FREE" ? "PRO" : "ENTERPRISE"
      );
    }
  }

  /**
   * Rate limits manual checks to prevent abuse based on plan quota per hour.
   */
  static async assertCanTriggerManualCheck(workspaceId: string): Promise<void> {
    const sub = await this.getWorkspaceSubscription(workspaceId);
    const plan = getPlanConfig(sub.tier);

    const cacheKey = `manual_checks:${workspaceId}:${new Date().getHours()}`;
    const current = (await CacheManager.get<number>(cacheKey)) || 0;

    if (current >= plan.maxManualChecksPerHour) {
      throw new QuotaExceededError(
        `Manual check rate limit reached (${plan.maxManualChecksPerHour}/hour). Please wait before testing again.`,
        "MANUAL_CHECKS_LIMIT_REACHED",
        current,
        plan.maxManualChecksPerHour,
        sub.tier === "FREE" ? "PRO" : "ENTERPRISE"
      );
    }

    await CacheManager.set(cacheKey, current + 1, 3600);
  }

  /**
   * Get full usage and quota metrics for UI presentation.
   */
  static async getWorkspaceUsage(workspaceId: string): Promise<WorkspaceUsageSummary> {
    const sub = await this.getWorkspaceSubscription(workspaceId);
    const plan = getPlanConfig(sub.tier);

    const endpointCount = await db.endpoint.count({
      where: { workspaceId, isActive: true },
    }).catch(() => 0);

    const isTrial = sub.status === SubscriptionStatus.TRIALING;
    let trialDaysRemaining = 0;
    if (isTrial && sub.trialEndsAt) {
      const msLeft = new Date(sub.trialEndsAt).getTime() - Date.now();
      trialDaysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    }

    const percentUsed = Math.min(
      100,
      Math.round((endpointCount / Math.max(1, plan.maxEndpoints)) * 100)
    );

    return {
      tier: sub.tier,
      status: sub.status,
      planName: plan.name,
      isTrial,
      trialDaysRemaining,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      endpoints: {
        used: endpointCount,
        max: plan.maxEndpoints,
        percent: percentUsed,
      },
      intervalSeconds: {
        minAllowed: plan.minIntervalSeconds,
      },
      retentionDays: plan.retentionDays,
      features: plan.features,
    };
  }
}

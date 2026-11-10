import { SubscriptionTier, BillingCycle } from "@prisma/client";

export interface PlanLimits {
  tier: SubscriptionTier;
  name: string;
  badge?: string;
  description: string;
  priceMonthlyCents: number;
  priceAnnualCents: number; // billed annually
  maxEndpoints: number;
  minIntervalSeconds: number; // in seconds: 300 (5m), 60 (1m), 10 (10s)
  retentionDays: number;
  maxManualChecksPerHour: number;
  features: {
    sslMonitoring: boolean;
    webhookAlerts: boolean;
    discordAlerts: boolean;
    slackAlerts: boolean;
    publicStatusPage: "basic" | "custom_brand" | "custom_domain";
    slaReports: boolean;
    priorityWorkerProbes: boolean;
    dedicatedSupport: boolean;
  };
  highlighted?: boolean;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, PlanLimits> = {
  FREE: {
    tier: SubscriptionTier.FREE,
    name: "Free Starter",
    description: "Essential uptime monitoring for hobbyists, side-projects, and solo developers.",
    priceMonthlyCents: 0,
    priceAnnualCents: 0,
    maxEndpoints: 5,
    minIntervalSeconds: 300, // 5 minutes
    retentionDays: 1, // 24 hours
    maxManualChecksPerHour: 10,
    features: {
      sslMonitoring: false,
      webhookAlerts: false,
      discordAlerts: false,
      slackAlerts: false,
      publicStatusPage: "basic",
      slaReports: false,
      priorityWorkerProbes: false,
      dedicatedSupport: false,
    },
    highlighted: false,
  },
  PRO: {
    tier: SubscriptionTier.PRO,
    name: "Pro Engineer",
    badge: "Most Popular",
    description: "High-frequency monitoring, SSL tracking, and instant alerts for production services.",
    priceMonthlyCents: 1900, // $19.00 / month
    priceAnnualCents: 19000, // $190.00 / year ($15.83/mo)
    maxEndpoints: 50,
    minIntervalSeconds: 60, // 1 minute
    retentionDays: 30, // 30 days
    maxManualChecksPerHour: 60,
    features: {
      sslMonitoring: true,
      webhookAlerts: true,
      discordAlerts: true,
      slackAlerts: true,
      publicStatusPage: "custom_brand",
      slaReports: true,
      priorityWorkerProbes: true,
      dedicatedSupport: false,
    },
    highlighted: true,
  },
  ENTERPRISE: {
    tier: SubscriptionTier.ENTERPRISE,
    name: "Enterprise Scale",
    badge: "Maximum Resilience",
    description: "Sub-minute probes, custom domain status pages, and enterprise SLA guarantees.",
    priceMonthlyCents: 9900, // $99.00 / month
    priceAnnualCents: 99000, // $990.00 / year ($82.50/mo)
    maxEndpoints: 500,
    minIntervalSeconds: 10, // 10 seconds
    retentionDays: 365, // 1 full year
    maxManualChecksPerHour: 300,
    features: {
      sslMonitoring: true,
      webhookAlerts: true,
      discordAlerts: true,
      slackAlerts: true,
      publicStatusPage: "custom_domain",
      slaReports: true,
      priorityWorkerProbes: true,
      dedicatedSupport: true,
    },
    highlighted: false,
  },
};

export const FREE_TRIAL_DURATION_DAYS = 14;

export function getPlanConfig(tier: SubscriptionTier): PlanLimits {
  return SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS.FREE;
}

export function formatPrice(cents: number, cycle: BillingCycle = "MONTHLY"): string {
  if (cents === 0) return "$0";
  const dollars = (cents / 100).toFixed(0);
  return cycle === "ANNUAL" ? `$${dollars}/yr` : `$${dollars}/mo`;
}

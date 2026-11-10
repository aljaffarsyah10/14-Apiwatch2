"use client";

import * as React from "react";
import {
  Save,
  Bell,
  Shield,
  Mail,
  Loader2,
  Webhook,
  Send,
  CheckCircle2,
  CreditCard,
  Sparkles,
  Zap,
  ArrowUpRight,
  Receipt,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { getNotificationSettings, saveNotificationSetting } from "@/lib/api/notifications";
import { getMe } from "@/lib/api/auth";
import { toast } from "sonner";
import Link from "next/link";

interface UsageData {
  tier: "FREE" | "PRO" | "ENTERPRISE";
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";
  planName: string;
  isTrial: boolean;
  trialDaysRemaining: number;
  currentPeriodEnd: string;
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
  features: {
    sslMonitoring: boolean;
    webhookAlerts: boolean;
    discordAlerts: boolean;
    slackAlerts: boolean;
    slaReports: boolean;
  };
}

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  amountPaid: number;
  currency: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  hostedUrl?: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState<"general" | "notifications" | "billing">("general");

  const [workspaceName, setWorkspaceName] = React.useState("Default Workspace");
  const [alertEmail, setAlertEmail] = React.useState("");
  const [emailAlertsEnabled, setEmailAlertsEnabled] = React.useState(true);
  const [notifyOnRecovery, setNotifyOnRecovery] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  // Webhook settings
  const [webhookUrl, setWebhookUrl] = React.useState("");
  const [webhookChannel, setWebhookChannel] = React.useState<"DISCORD" | "SLACK" | "GENERIC">("DISCORD");
  const [webhookEnabled, setWebhookEnabled] = React.useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = React.useState(false);
  const [webhookTestStatus, setWebhookTestStatus] = React.useState<{ success: boolean; message: string } | null>(null);

  // Billing and Subscription state
  const [subscriptionUsage, setSubscriptionUsage] = React.useState<UsageData | null>(null);
  const [invoices, setInvoices] = React.useState<InvoiceRecord[]>([]);
  const [isUpgrading, setIsUpgrading] = React.useState(false);
  const [isCanceling, setIsCanceling] = React.useState(false);
  const [refreshCount, setRefreshCount] = React.useState(0);

  React.useEffect(() => {
    let ignore = false;
    async function fetchSettings() {
      try {
        const savedWebhook = localStorage.getItem("apiwatch_webhook_config");
        if (savedWebhook && !ignore) {
          try {
            const parsed = JSON.parse(savedWebhook);
            if (parsed.url) setWebhookUrl(parsed.url);
            if (parsed.channel) setWebhookChannel(parsed.channel);
            if (parsed.enabled !== undefined) setWebhookEnabled(parsed.enabled);
          } catch {
            // ignore JSON parse error
          }
        }

        const [userData, settings, subRes] = await Promise.all([
          getMe().catch(() => ({ user: null })),
          getNotificationSettings().catch(() => []),
          fetch("/api/billing/subscription")
            .then((r) => r.json())
            .catch(() => null),
        ]);

        if (!ignore) {
          if (userData?.user?.email) {
            setAlertEmail(userData.user.email);
            if (userData.user.workspaces?.[0]?.name) {
              setWorkspaceName(userData.user.workspaces[0].name);
            }
          }

          if (settings.length > 0) {
            setAlertEmail(settings[0].email);
            setEmailAlertsEnabled(settings[0].enabled);
          }

          if (subRes?.success && subRes?.data) {
            setSubscriptionUsage(subRes.data.usage);
            setInvoices(subRes.data.invoices || []);
          }
          setIsLoading(false);
        }
      } catch (err: unknown) {
        console.error("Failed to load settings:", err);
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void fetchSettings();
    return () => {
      ignore = true;
    };
  }, [refreshCount]);

  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      toast.error("Please enter a Webhook URL before testing.");
      return;
    }

    try {
      setIsTestingWebhook(true);
      setWebhookTestStatus(null);
      toast.info("Sending test alert to webhook channel...");

      const res = await fetch("/api/settings/webhook/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl,
          channelType: webhookChannel,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setWebhookTestStatus({ success: false, message: data.error || "Failed to deliver webhook" });
        toast.error(data.error || "Webhook test failed");
      } else {
        setWebhookTestStatus({ success: true, message: data.message });
        toast.success(data.message || "Webhook delivery verified!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error testing webhook";
      setWebhookTestStatus({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertEmail) return;

    try {
      setIsSaving(true);
      await saveNotificationSetting(alertEmail, emailAlertsEnabled);

      // Save webhook to local storage
      localStorage.setItem(
        "apiwatch_webhook_config",
        JSON.stringify({
          url: webhookUrl,
          channel: webhookChannel,
          enabled: webhookEnabled,
        })
      );

      toast.success("Workspace and notification settings saved successfully.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSandboxUpgrade = async (targetTier: "PRO" | "ENTERPRISE") => {
    try {
      setIsUpgrading(true);
      const res = await fetch("/api/billing/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "sandbox.simulate.payment",
          data: {
            workspaceId: (await getMe())?.user?.workspaceId,
            tier: targetTier,
            cycle: "MONTHLY",
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Sandbox payment failed");
      }

      toast.success(`Sandbox payment successful! Plan upgraded to ${targetTier}.`);
      setRefreshCount((c) => c + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upgrade failed");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setIsCanceling(true);
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to cancel subscription");
      }
      toast.info("Subscription will not renew at the end of the current period.");
      setRefreshCount((c) => c + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setIsCanceling(false);
    }
  };

  const handleResumeSubscription = async () => {
    try {
      setIsCanceling(true);
      const res = await fetch("/api/billing/resume", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to resume subscription");
      }
      toast.success("Subscription renewal resumed successfully.");
      setRefreshCount((c) => c + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resume failed");
    } finally {
      setIsCanceling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <PageHeader
          title="Settings"
          description="Configure workspace details, alert notifications, and team preferences."
        />
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Settings & Subscription"
        description="Manage workspace identity, team alert notifications, subscription plans, and billing."
      />

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-border space-x-1 sm:space-x-2">
        <button
          onClick={() => setActiveTab("general")}
          className={`pb-3 px-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "general"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Shield className="w-4 h-4" />
          General & Workspace
        </button>
        <button
          onClick={() => setActiveTab("notifications")}
          className={`pb-3 px-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "notifications"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bell className="w-4 h-4" />
          Notifications & Alerts
        </button>
        <button
          onClick={() => setActiveTab("billing")}
          className={`pb-3 px-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "billing"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Plans & Billing
          {subscriptionUsage?.isTrial && (
            <Badge className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0 border-indigo-500/30">
              {subscriptionUsage.trialDaysRemaining}d trial
            </Badge>
          )}
        </button>
      </div>

      {/* TAB 1: General & Workspace */}
      {activeTab === "general" && (
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Workspace Profile
              </CardTitle>
              <CardDescription>
                Manage workspace identity and team association.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace">Workspace Name</Label>
                <Input
                  id="workspace"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}

      {/* TAB 2: Notifications & Webhook */}
      {activeTab === "notifications" && (
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-400" />
                Email Notification Alerts
              </CardTitle>
              <CardDescription>
                Configure alert dispatching when monitored endpoints experience outages.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Alert Recipient Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  placeholder="alerts@company.com"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Automated incident alerts will be dispatched to this address.
                </p>
              </div>

              <div className="pt-2 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailAlertsEnabled}
                    onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4 mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-semibold text-foreground block">
                      Send automated alert on outage (DOWN status)
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Dispatches email notification when consecutive health checks fail.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyOnRecovery}
                    onChange={(e) => setNotifyOnRecovery(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4 mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-semibold text-foreground block">
                      Send notification when service recovers (RESOLVED status)
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Dispatches confirmation notice when an ongoing incident is resolved.
                    </span>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Webhook Integrations Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Webhook className="h-5 w-5 text-primary" />
                Webhook & Chat Integrations (Slack / Discord)
              </CardTitle>
              <CardDescription>
                Stream real-time outage alerts directly into your Discord channel, Slack workspace, or custom webhook endpoint.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="webhookChannel">Channel Type</Label>
                  <select
                    id="webhookChannel"
                    value={webhookChannel}
                    onChange={(e) => setWebhookChannel(e.target.value as "DISCORD" | "SLACK" | "GENERIC")}
                    className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm font-semibold shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="DISCORD">Discord</option>
                    <option value="SLACK">Slack</option>
                    <option value="GENERIC">Custom HTTP</option>
                  </select>
                </div>

                <div className="space-y-2 sm:col-span-3">
                  <Label htmlFor="webhookUrl">Webhook Target URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="webhookUrl"
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder={
                        webhookChannel === "DISCORD"
                          ? "https://discord.com/api/webhooks/..."
                          : webhookChannel === "SLACK"
                          ? "https://hooks.slack.com/services/..."
                          : "https://your-api.com/webhooks/alerts"
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestWebhook}
                      disabled={isTestingWebhook || !webhookUrl}
                      className="gap-1.5 shrink-0"
                    >
                      {isTestingWebhook ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 text-primary" />
                      )}
                      Test Webhook
                    </Button>
                  </div>
                </div>
              </div>

              {webhookTestStatus && (
                <div
                  className={`p-3 rounded-lg border flex items-center gap-2.5 text-sm ${
                    webhookTestStatus.success
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/25 text-rose-400"
                  }`}
                >
                  {webhookTestStatus.success && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  <span>{webhookTestStatus.message}</span>
                </div>
              )}

              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={webhookEnabled}
                    onChange={(e) => setWebhookEnabled(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4 mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-semibold text-foreground block">
                      Dispatch outage and recovery alerts to this webhook
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Instant JSON payload delivered as soon as incidents are opened or resolved.
                    </span>
                  </div>
                </label>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Notifications
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}

      {/* TAB 3: Plans & Billing */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          {/* Active Plan Card */}
          <Card className="border-indigo-500/30 bg-gradient-to-br from-card via-card to-indigo-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <CardTitle className="text-xl font-bold">
                    {subscriptionUsage?.planName || "Pro Engineer"}
                  </CardTitle>
                  {subscriptionUsage?.isTrial && (
                    <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      14-Day Free Trial
                    </Badge>
                  )}
                  {subscriptionUsage?.status === "ACTIVE" && (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Active
                    </Badge>
                  )}
                  {subscriptionUsage?.cancelAtPeriodEnd && (
                    <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                      Cancels at period end
                    </Badge>
                  )}
                </div>
                <CardDescription className="mt-1">
                  {subscriptionUsage?.isTrial
                    ? `${subscriptionUsage.trialDaysRemaining} days remaining in your free Pro trial period.`
                    : "Your active workspace subscription."}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/pricing">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    View All Plans
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              {/* Quota Gauge Meters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-border bg-card/60">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span className="font-medium text-foreground">Endpoints Used</span>
                    <span>
                      {subscriptionUsage?.endpoints.used || 0} / {subscriptionUsage?.endpoints.max || 50}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${subscriptionUsage?.endpoints.percent || 0}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card/60">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span className="font-medium text-foreground">Minimum Check Interval</span>
                    <span>{subscriptionUsage?.intervalSeconds.minAllowed || 60}s</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    High-frequency probes detect downtime within seconds.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card/60">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span className="font-medium text-foreground">History Retention</span>
                    <span>{subscriptionUsage?.retentionDays || 30} days</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Historical metrics, latencies, and incident timelines stored.
                  </p>
                </div>
              </div>

              {/* Actions & Sandbox Payment Controls */}
              <div className="p-4 rounded-xl border border-dashed border-indigo-500/30 bg-indigo-500/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Sandbox Billing Engine
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Simulate instant subscription upgrades in Sandbox mode without a real credit card.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={isUpgrading}
                    onClick={() => handleSandboxUpgrade("PRO")}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
                  >
                    {isUpgrading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    Simulate Pro ($19/mo)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isUpgrading}
                    onClick={() => handleSandboxUpgrade("ENTERPRISE")}
                    className="text-xs gap-1.5"
                  >
                    Simulate Enterprise ($99/mo)
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center text-xs text-muted-foreground border-t border-border/60 pt-4">
              <span>
                Renewal Date:{" "}
                {subscriptionUsage?.currentPeriodEnd
                  ? new Date(subscriptionUsage.currentPeriodEnd).toLocaleDateString()
                  : "N/A"}
              </span>
              <div>
                {subscriptionUsage?.cancelAtPeriodEnd ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isCanceling}
                    onClick={handleResumeSubscription}
                    className="text-xs text-indigo-400 hover:text-indigo-300 gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Resume Auto-Renewal
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isCanceling}
                    onClick={handleCancelSubscription}
                    className="text-xs text-rose-400 hover:text-rose-300"
                  >
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>

          {/* Invoices History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Invoice History & Receipts
              </CardTitle>
              <CardDescription>
                Download past invoices and view payment statuses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No invoices generated yet. Invoices appear here after trial conclusion or plan activation.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="py-3 flex items-center justify-between text-sm">
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          {inv.invoiceNumber}
                          <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px] px-1.5 py-0 border-emerald-500/20">
                            {inv.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(inv.createdAt).toLocaleDateString()} • USD ${(inv.amountPaid / 100).toFixed(2)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toast.info(`Viewing receipt for ${inv.invoiceNumber}`)}
                        className="text-xs gap-1 text-primary"
                      >
                        Receipt
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

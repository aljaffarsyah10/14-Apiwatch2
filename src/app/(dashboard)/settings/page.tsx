"use client";

import * as React from "react";
import { Save, Bell, Shield, Mail, Loader2, Webhook, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { getNotificationSettings, saveNotificationSetting } from "@/lib/api/notifications";
import { getMe } from "@/lib/api/auth";
import { toast } from "sonner";

export default function SettingsPage() {
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

  React.useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoading(true);

        // Load local webhook config
        const savedWebhook = localStorage.getItem("apiwatch_webhook_config");
        if (savedWebhook) {
          try {
            const parsed = JSON.parse(savedWebhook);
            if (parsed.url) setWebhookUrl(parsed.url);
            if (parsed.channel) setWebhookChannel(parsed.channel);
            if (parsed.enabled !== undefined) setWebhookEnabled(parsed.enabled);
          } catch {
            // ignore JSON parse error
          }
        }

        const [userData, settings] = await Promise.all([
          getMe().catch(() => ({ user: null })),
          getNotificationSettings().catch(() => []),
        ]);

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
      } catch (err: unknown) {
        console.error("Failed to load settings:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

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

      toast.success("All workspace & notification settings saved successfully.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
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
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Settings"
        description="Configure workspace details, alert notifications, and team preferences."
      />

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
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-warning" />
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
                    ? "bg-success/10 border-success/25 text-success"
                    : "bg-destructive/10 border-destructive/25 text-destructive"
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
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving} className="gap-2">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

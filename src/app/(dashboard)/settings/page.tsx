"use client";

import * as React from "react";
import { Save, Bell, Shield, Mail, Loader2 } from "lucide-react";
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

  React.useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoading(true);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertEmail) return;

    try {
      setIsSaving(true);
      await saveNotificationSetting(alertEmail, emailAlertsEnabled);
      toast.success("Notification preferences saved successfully.");
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

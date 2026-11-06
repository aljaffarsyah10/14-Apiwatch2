"use client";

import * as React from "react";
import { Save, Bell, Shield, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function SettingsPage() {
  const [workspaceName, setWorkspaceName] = React.useState("Personal Workspace");
  const [alertEmail, setAlertEmail] = React.useState("developer@apiwatch.dev");
  const [emailAlertsEnabled, setEmailAlertsEnabled] = React.useState(true);
  const [notifyOnRecovery, setNotifyOnRecovery] = React.useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Workspace and notification preferences saved successfully.");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Settings"
        description="Configure workspace details, alert notifications, and team preferences."
      />

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Workspace Profile
            </CardTitle>
            <CardDescription className="text-xs">
              Manage workspace identity and ownership.
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

        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              Email Notification Alerts
            </CardTitle>
            <CardDescription className="text-xs">
              Configure alert dispatching when endpoints experience outages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Alert Recipient Email
              </Label>
              <Input
                id="email"
                type="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Automated incident alerts will be dispatched to this address.
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailAlertsEnabled}
                  onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <div>
                  <span className="text-sm font-medium text-foreground block">
                    Send immediate alert on outage (DOWN status)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Dispatches notification upon the very first assertion failure or timeout.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnRecovery}
                  onChange={(e) => setNotifyOnRecovery(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <div>
                  <span className="text-sm font-medium text-foreground block">
                    Send recovery notification when service is restored
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Notifies when an endpoint transitions back from DOWN to UP.
                  </span>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="gap-2">
            <Save className="h-4 w-4" />
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
}

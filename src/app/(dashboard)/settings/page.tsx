"use client";

import * as React from "react";
import { Save, Bell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function SettingsPage() {
  const [workspaceName, setWorkspaceName] = React.useState("Personal Workspace");
  const [alertEmail, setAlertEmail] = React.useState("developer@apiwatch.dev");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Workspace settings updated.");
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
              Recipients that will receive automated email alerts whenever an endpoint status transitions to DOWN or recovers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Alert Recipient Email</Label>
              <Input
                id="email"
                type="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ReportsPage() {
  const handleExport = () => {
    toast.info("Report CSV export will be generated in Phase 8.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Uptime Reports"
        description="Weekly and monthly availability metrics, downtime summary, and latency percentiles."
      >
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 text-xs">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base">Monthly SLA Compliance</CardTitle>
            <CardDescription className="text-xs">
              Overall uptime performance calculated across all active monitored endpoints.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-muted-foreground">Overall Uptime</span>
              <span className="font-mono text-3xl font-bold text-emerald-500">99.92%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: "99.92%" }} />
            </div>
            <p className="text-xs text-muted-foreground">
              Based on 28,400 checks executed over the last 30 days.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base">Latency Percentiles</CardTitle>
            <CardDescription className="text-xs">
              Global distribution of response times.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-mono text-sm">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Median (p50):</span>
              <span className="font-semibold text-foreground">78 ms</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">90th Percentile (p90):</span>
              <span className="font-semibold text-foreground">164 ms</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">99th Percentile (p99):</span>
              <span className="font-semibold text-foreground">412 ms</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

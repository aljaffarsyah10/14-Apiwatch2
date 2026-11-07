"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, CheckCircle, AlertTriangle, ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { getReportsData, ReportsData } from "@/lib/api/reports";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

export default function PublicStatusPage() {
  const [data, setData] = React.useState<ReportsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshIndex, setRefreshIndex] = React.useState(0);

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await getReportsData();
        if (!ignore) {
          setData(res);
          setIsLoading(false);
        }
      } catch {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [refreshIndex]);

  const hasOutage = data?.endpoints.some((e) => e.status === "DOWN");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-base tracking-tight">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Activity className="h-4 w-4" />
            </div>
            APIWatch <span className="text-muted-foreground text-xs font-mono font-normal">/ Status</span>
          </Link>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" render={<Link href="/" />} className="text-xs gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsLoading(true);
                setRefreshIndex((p) => p + 1);
              }}
              className="text-xs gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Status Callout Banner */}
        <div
          className={`rounded-2xl p-6 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            hasOutage
              ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-xl shrink-0 ${
                hasOutage ? "bg-rose-500/20 text-rose-500" : "bg-emerald-500/20 text-emerald-500"
              }`}
            >
              {hasOutage ? (
                <AlertTriangle className="h-6 w-6 animate-pulse" />
              ) : (
                <CheckCircle className="h-6 w-6" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {hasOutage ? "Active Service Disruption" : "All Systems Fully Operational"}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {hasOutage
                  ? "Our automated background workers detected assertions failure on one or more monitored services."
                  : "Continuous health checks, multi-layer SSRF validation, and background probe workers are operating normally."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="font-mono text-xs px-2.5 py-1">
              SLA: {data ? `${data.overallUptime}%` : "100%"}
            </Badge>
          </div>
        </div>

        {/* Uptime Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border border-border">
            <CardHeader className="py-4">
              <CardDescription className="text-xs">Overall Availability</CardDescription>
              <CardTitle className="text-2xl font-mono text-emerald-500">
                {data ? `${data.overallUptime}%` : "100%"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border border-border">
            <CardHeader className="py-4">
              <CardDescription className="text-xs">Average Response Time</CardDescription>
              <CardTitle className="text-2xl font-mono">
                {data ? `${data.overallAvgLatency} ms` : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border border-border">
            <CardHeader className="py-4">
              <CardDescription className="text-xs">Active Services</CardDescription>
              <CardTitle className="text-2xl font-mono flex items-center gap-2">
                {data ? data.totalEndpoints : 0}
                <span className="text-xs font-normal text-muted-foreground font-sans flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Verified
                </span>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Monitored Services List */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Service Health Components</CardTitle>
            <CardDescription className="text-xs">
              Live status and uptime compliance across registered API endpoints.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <LoadingSkeleton type="table" />
            ) : !data || data.endpoints.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No public services currently registered on the status board.
              </div>
            ) : (
              data.endpoints.map((ep) => (
                <div
                  key={ep.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-sm block">{ep.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {ep.method} • {ep.avgResponseTime}ms avg latency
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs font-semibold text-emerald-500 hidden sm:inline-block">
                      {ep.uptimePercentage}%
                    </span>
                    <StatusBadge status={ep.status} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Powered by APIWatch — Automated API monitoring and reliability engineering.
      </footer>
    </div>
  );
}

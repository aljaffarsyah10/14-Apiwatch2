"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, CheckCircle, AlertTriangle, ArrowLeft, RefreshCw, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { getReportsData, ReportsData } from "@/lib/api/reports";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

function getMethodBadgeClass(method: string) {
  switch (method.toUpperCase()) {
    case "GET":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
    case "POST":
      return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25";
    case "PUT":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25";
    case "DELETE":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

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
    <div className="min-h-screen bg-background text-foreground flex flex-col bg-radial-glow">
      {/* Top Navbar */}
      <header className="border-b border-border/80 bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-base tracking-tight group">
            <div className="h-8 w-8 rounded-xl bg-linear-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shadow-xs shadow-primary/20">
              <Activity className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-foreground">APIWatch</span>
              <span className="text-muted-foreground text-xs font-mono font-normal">/ Status</span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" render={<Link href="/" />} className="text-xs gap-1.5 text-muted-foreground hover:text-foreground">
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
              className="text-xs gap-1.5 border-border/80"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* Status Callout Banner */}
        <div
          className={`rounded-3xl p-6 sm:p-8 border shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition-all ${
            hasOutage
              ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`p-3.5 rounded-2xl shrink-0 mt-0.5 sm:mt-0 ${
                hasOutage ? "bg-rose-500/20 text-rose-600 dark:text-rose-400" : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {hasOutage ? (
                <AlertTriangle className="h-7 w-7 animate-pulse" />
              ) : (
                <CheckCircle className="h-7 w-7" />
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {hasOutage ? "Active Service Disruption Detected" : "All Monitored Services Fully Operational"}
              </h1>
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground mt-1 max-w-2xl">
                {hasOutage
                  ? "Our automated background workers detected assertions failure on one or more monitored services."
                  : "Continuous health checks, multi-layer SSRF validation, and background probe workers are operating normally."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={`font-mono text-xs sm:text-sm px-3.5 py-1.5 font-semibold rounded-full shadow-2xs ${
                hasOutage
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              SLA: {data ? `${data.overallUptime}%` : "100%"}
            </Badge>
          </div>
        </div>

        {/* Uptime Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="py-4">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">Overall Availability</CardDescription>
              <CardTitle className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {data ? `${data.overallUptime}%` : "100%"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="py-4">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">Average Latency</CardDescription>
              <CardTitle className="text-3xl font-extrabold font-mono mt-1">
                {data ? `${data.overallAvgLatency} ms` : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="py-4">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">Active Services</CardDescription>
              <CardTitle className="text-3xl font-extrabold font-mono flex items-center gap-3 mt-1">
                {data ? data.totalEndpoints : 0}
                <span className="text-xs font-normal text-muted-foreground font-sans flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Verified
                </span>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Monitored Services List */}
        <Card className="border border-border/80 shadow-xs overflow-hidden">
          <CardHeader className="border-b border-border/60 bg-muted/20 py-4 px-6">
            <CardTitle className="text-base font-bold">Service Health Components</CardTitle>
            <CardDescription className="text-xs">
              Live status and uptime compliance across registered API endpoints.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3">
            {isLoading ? (
              <LoadingSkeleton variant="table" />
            ) : !data || data.endpoints.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No public services currently registered on the status board.
              </div>
            ) : (
              data.endpoints.map((ep) => (
                <div
                  key={ep.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-card/60 hover:bg-muted/40 transition-all gap-4"
                >
                  <div className="space-y-1 truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">{ep.name}</span>
                      <Badge variant="outline" className={`font-mono text-[10px] font-semibold px-1.5 py-0 ${getMethodBadgeClass(ep.method)}`}>
                        {ep.method}
                      </Badge>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> {ep.avgResponseTime}ms avg response time
                    </span>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 hidden sm:inline-block">
                      {ep.uptimePercentage}% Uptime
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
      <footer className="border-t border-border/80 py-8 text-center text-xs text-muted-foreground">
        Powered by APIWatch — Automated API monitoring and reliability engineering.
      </footer>
    </div>
  );
}

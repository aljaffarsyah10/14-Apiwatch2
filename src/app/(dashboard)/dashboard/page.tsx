"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Radio,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Activity,
  RefreshCw,
  Play,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";

const LatencyChart = dynamic(
  () => import("@/components/endpoints/latency-chart").then((mod) => mod.LatencyChart),
  {
    ssr: false,
    loading: () => <div className="h-60 w-full animate-pulse rounded-lg bg-muted/40" />,
  }
);
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { getDashboardSummary, DashboardSummaryData } from "@/lib/api/dashboard";
import { getEndpoints, EndpointItem, checkAllEndpoints } from "@/lib/api/endpoints";
import { toast } from "sonner";

function getMethodBadgeClass(method: string) {
  switch (method.toUpperCase()) {
    case "GET":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
    case "POST":
      return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25";
    case "PUT":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25";
    case "PATCH":
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25";
    case "DELETE":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function getLatencyBadge(latencyMs: number | null | undefined) {
  if (latencyMs === undefined || latencyMs === null) {
    return <span className="text-muted-foreground text-xs">Pending</span>;
  }
  const rounded = Math.round(latencyMs);
  let colorClass = "text-emerald-600 dark:text-emerald-400";
  if (rounded > 300) {
    colorClass = "text-amber-600 dark:text-amber-400";
  } else if (rounded > 150) {
    colorClass = "text-sky-600 dark:text-sky-400";
  }
  return <span className={`font-mono font-semibold tabular-nums ${colorClass}`}>{rounded} ms</span>;
}

export default function DashboardOverviewPage() {
  const [summary, setSummary] = React.useState<DashboardSummaryData | null>(null);
  const [endpoints, setEndpoints] = React.useState<EndpointItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = React.useState(0);
  const [isCheckingAll, setIsCheckingAll] = React.useState(false);

  const handleCheckAll = async () => {
    try {
      setIsCheckingAll(true);
      toast.info("Triggering real-time health checks on all endpoints...");
      const res = await checkAllEndpoints();
      toast.success(res.message);
      handleRefresh();
    } catch {
      toast.error("Failed to execute batch checks");
    } finally {
      setIsCheckingAll(false);
    }
  };

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const [sumData, epData] = await Promise.all([
          getDashboardSummary(),
          getEndpoints(),
        ]);
        if (!ignore) {
          setSummary(sumData);
          setEndpoints(epData);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard data");
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [refreshIndex]);

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshIndex((prev) => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Overview"
          description="Real-time uptime metrics, health status, and latency across your workspaces."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
        </div>
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <ErrorState
        title="Could not load dashboard metrics"
        description={error || "An unexpected error occurred while fetching dashboard summary."}
        onRetry={handleRefresh}
      />
    );
  }

  const activeIncident = summary.recentActiveIncidents[0];
  const chartData = summary.latencyTimeline.length > 0
    ? summary.latencyTimeline.map((item) => ({
        time: new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        latency: item.latency,
      }))
    : [
        { time: "00:00", latency: 0 },
        { time: "06:00", latency: 0 },
        { time: "12:00", latency: 0 },
        { time: "18:00", latency: 0 },
      ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Overview"
        description="Real-time uptime metrics, health status, and latency across your workspaces."
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            onClick={handleCheckAll}
            disabled={isCheckingAll}
            className="gap-2 border-border/80 hover:bg-muted/60"
          >
            {isCheckingAll ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Play className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />
            )}
            <span>{isCheckingAll ? "Executing Checks..." : "Check All Now"}</span>
          </Button>

          <Button variant="outline" onClick={handleRefresh} className="gap-1.5 border-border/80 hover:bg-muted/60">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>

          <Button render={<Link href="/endpoints/new" />} className="gap-2 shadow-xs shadow-primary/20">
            <Plus className="h-4 w-4" />
            Add Endpoint
          </Button>
        </div>
      </PageHeader>

      {/* Active Incident Callout Banner */}
      {activeIncident && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-destructive/20 text-destructive shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-bold text-foreground">
                  Active Downtime: {activeIncident.endpointName}
                </span>
                <StatusBadge status="DOWN" />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {activeIncident.failureReason || "Failing assertion validation rules"} • Started{" "}
                {new Date(activeIncident.startedAt).toLocaleString()}
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            render={<Link href={`/endpoints/${activeIncident.endpointId}`} />}
            className="shrink-0 font-semibold shadow-xs"
          >
            Investigate Incident
          </Button>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monitored Endpoints"
          value={summary.totalEndpoints}
          description="Total active monitored services"
          icon={<Radio className="h-[18px] w-[18px] text-primary" />}
        />
        <StatCard
          title="Healthy (UP)"
          value={summary.healthyCount}
          description="Meeting SLA availability"
          icon={<CheckCircle className="h-[18px] w-[18px] text-emerald-500" />}
          trend={{ value: `${summary.uptime24h}% 24h SLA`, isPositive: true }}
        />
        <StatCard
          title="Active Outages"
          value={summary.outageCount}
          description="Endpoints failing assertions"
          icon={<AlertTriangle className="h-[18px] w-[18px] text-destructive" />}
          trend={summary.outageCount > 0 ? { value: "Action Required", isPositive: false } : undefined}
        />
        <StatCard
          title="Average Latency"
          value={`${summary.avgResponseTimeMs} ms`}
          description="Weighted 24h response time"
          icon={<Clock className="h-[18px] w-[18px] text-amber-500" />}
        />
      </div>

      {/* Latency Chart Card */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-[18px] w-[18px] text-primary" />
              Aggregate Latency Trend (Last 24 Hours)
            </CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              Continuous probe response times across all active endpoints in milliseconds.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="font-mono text-xs tabular-nums px-2.5 py-1">
              Avg {summary.avgResponseTimeMs} ms
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <LatencyChart data={chartData} height={230} />
        </CardContent>
      </Card>

      {/* Active Endpoints Table */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-4 py-4 px-6 border-b border-border/60 bg-muted/20">
          <div>
            <CardTitle className="text-base font-bold">Registered Endpoints</CardTitle>
            <CardDescription className="text-xs">
              Overview of target endpoints, response times, and health states.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" render={<Link href="/endpoints" />} className="shrink-0 gap-1 text-xs">
            Manage all <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {endpoints.length === 0 ? (
            <div className="py-12">
              <EmptyState
                title="No endpoints registered yet"
                description="Add your first HTTP/HTTPS API to start monitoring uptime, response times, and failure alerts."
                action={{
                  label: "Add Endpoint",
                  href: "/endpoints/new",
                }}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[35%]">Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Method</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead className="hidden sm:table-cell">Latest Latency</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {endpoints.slice(0, 10).map((ep) => {
                  const latestCheck = ep.checks?.[0];
                  return (
                    <TableRow key={ep.id} className="transition-colors hover:bg-muted/40">
                      <TableCell className="font-medium">
                        <Link href={`/endpoints/${ep.id}`} className="group flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                            {ep.name}
                            {ep.url.startsWith("https://") && (
                              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                            )}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground truncate max-w-sm">
                            {ep.url}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ep.status} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className={`font-mono text-[11px] font-semibold px-2 py-0.5 ${getMethodBadgeClass(ep.method)}`}>
                          {ep.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums text-xs text-muted-foreground">
                        {ep.intervalSeconds < 60 ? `${ep.intervalSeconds}s` : `${Math.round(ep.intervalSeconds / 60)}m`}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">
                        {getLatencyBadge(latestCheck?.responseTimeMs)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          render={<Link href={`/endpoints/${ep.id}`} />}
                          className="text-xs text-primary hover:text-primary hover:bg-primary/10"
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

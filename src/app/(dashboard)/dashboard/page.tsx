"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Radio, CheckCircle, AlertTriangle, Clock, ArrowUpRight, Activity, RefreshCw, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LatencyChart } from "@/components/endpoints/latency-chart";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { getDashboardSummary, DashboardSummaryData } from "@/lib/api/dashboard";
import { getEndpoints, EndpointItem, checkAllEndpoints } from "@/lib/api/endpoints";
import { toast } from "sonner";

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
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleCheckAll}
            disabled={isCheckingAll}
            className="gap-2"
          >
            {isCheckingAll ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Play className="h-4 w-4 text-success" />
            )}
            Check All Now
          </Button>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw />
            Refresh
          </Button>
          <Button render={<Link href="/endpoints/new" />}>
            <Plus />
            Add Endpoint
          </Button>
        </div>
      </PageHeader>

      {/* Active Incident Callout Banner */}
      {activeIncident && (
        <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10 text-destructive shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[0.9375rem] font-semibold text-foreground">
                  Active Downtime: {activeIncident.endpointName}
                </span>
                <StatusBadge status="DOWN" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {activeIncident.failureReason || "Failing assertions"} • Started{" "}
                {new Date(activeIncident.startedAt).toLocaleString()}
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            render={<Link href={`/endpoints/${activeIncident.endpointId}`} />}
            className="shrink-0"
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
          icon={<CheckCircle className="h-[18px] w-[18px] text-success" />}
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
          icon={<Clock className="h-[18px] w-[18px] text-warning" />}
        />
      </div>

      {/* Latency Chart Card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-[18px] w-[18px] text-primary" />
              Aggregate Latency Trend (Last 24 Hours)
            </CardTitle>
            <CardDescription className="mt-1">
              Measured response times across all active endpoints in milliseconds.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="tabular-nums shrink-0">
            Avg {summary.avgResponseTimeMs} ms
          </Badge>
        </CardHeader>
        <CardContent className="pt-1">
          <LatencyChart data={chartData} height={220} />
        </CardContent>
      </Card>

      {/* Active Endpoints Table */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Registered Endpoints</CardTitle>
            <CardDescription className="mt-1">
              Overview of all target HTTP/HTTPS endpoints and current health state.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" render={<Link href="/endpoints" />} className="shrink-0">
            Manage all <ArrowUpRight />
          </Button>
        </CardHeader>
        <CardContent className="px-0 -mb-5 border-t border-border">
          {endpoints.length === 0 ? (
            <div className="py-8">
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
                <TableRow>
                  <TableHead>Endpoint</TableHead>
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
                    <TableRow key={ep.id}>
                      <TableCell className="font-medium">
                        <Link href={`/endpoints/${ep.id}`} className="group flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{ep.name}</span>
                          <span className="font-mono text-[0.8125rem] text-muted-foreground truncate max-w-xs">
                            {ep.url}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ep.status} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-[0.8125rem] font-semibold">
                        {ep.method}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {ep.intervalSeconds < 60 ? `${ep.intervalSeconds}s` : `${Math.round(ep.intervalSeconds / 60)}m`}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell tabular-nums font-semibold text-foreground">
                        {latestCheck?.responseTimeMs !== undefined && latestCheck.responseTimeMs !== null
                          ? `${Math.round(latestCheck.responseTimeMs)} ms`
                          : "Pending"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" render={<Link href={`/endpoints/${ep.id}`} />} className="text-primary hover:text-primary">
                          Details
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

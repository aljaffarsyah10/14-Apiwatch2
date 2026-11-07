"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Radio, CheckCircle, AlertTriangle, Clock, ArrowUpRight, Activity, RefreshCw } from "lucide-react";
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
import { getEndpoints, EndpointItem } from "@/lib/api/endpoints";

export default function DashboardOverviewPage() {
  const [summary, setSummary] = React.useState<DashboardSummaryData | null>(null);
  const [endpoints, setEndpoints] = React.useState<EndpointItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = React.useState(0);

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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button render={<Link href="/endpoints/new" />} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Endpoint
          </Button>
        </div>
      </PageHeader>

      {/* Active Incident Callout Banner */}
      {activeIncident && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-500 shrink-0">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                  Active Downtime: {activeIncident.endpointName}
                </span>
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5 uppercase font-mono">
                  DOWN
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeIncident.failureReason || "Failing assertions"} • Started{" "}
                {new Date(activeIncident.startedAt).toLocaleString()}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/endpoints/${activeIncident.endpointId}`} />}
            className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs shrink-0"
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
          icon={<Radio className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Healthy (UP)"
          value={summary.healthyCount}
          description="Meeting SLA availability"
          icon={<CheckCircle className="h-4 w-4 text-emerald-500" />}
          trend={{ value: `${summary.uptime24h}% 24h SLA`, isPositive: true }}
        />
        <StatCard
          title="Active Outages"
          value={summary.outageCount}
          description="Endpoints failing assertions"
          icon={<AlertTriangle className="h-4 w-4 text-rose-500" />}
          trend={summary.outageCount > 0 ? { value: "Action Required", isPositive: false } : undefined}
        />
        <StatCard
          title="Average Latency"
          value={`${summary.avgResponseTimeMs} ms`}
          description="Weighted 24h response time"
          icon={<Clock className="h-4 w-4 text-amber-500" />}
        />
      </div>

      {/* Latency Chart Card */}
      <Card className="border border-border">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Aggregate Latency Trend (Last 24 Hours)
            </CardTitle>
            <CardDescription className="text-xs">
              Measured response times across all active endpoints in milliseconds.
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            Avg: {summary.avgResponseTimeMs}ms
          </Badge>
        </CardHeader>
        <CardContent className="pt-2 pb-6 px-4">
          <LatencyChart data={chartData} height={220} />
        </CardContent>
      </Card>

      {/* Active Endpoints Table */}
      <Card className="border border-border">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-base font-semibold">Registered Endpoints</CardTitle>
            <CardDescription className="text-xs">
              Overview of all target HTTP/HTTPS endpoints and current health state.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" render={<Link href="/endpoints" />} className="gap-1 text-xs">
            Manage All <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
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
                        <Link href={`/endpoints/${ep.id}`} className="hover:underline flex flex-col">
                          <span className="font-semibold text-foreground text-sm">{ep.name}</span>
                          <span className="font-mono text-xs text-muted-foreground truncate max-w-xs">
                            {ep.url}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ep.status} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs font-semibold">
                        {ep.method}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {ep.intervalSeconds < 60 ? `${ep.intervalSeconds}s` : `${Math.round(ep.intervalSeconds / 60)}m`}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-xs font-medium text-emerald-500">
                        {latestCheck?.responseTimeMs !== undefined && latestCheck.responseTimeMs !== null
                          ? `${Math.round(latestCheck.responseTimeMs)} ms`
                          : "Pending"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" render={<Link href={`/endpoints/${ep.id}`} />}>
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

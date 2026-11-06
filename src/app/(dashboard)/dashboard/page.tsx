"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Radio, CheckCircle, AlertTriangle, Clock, ArrowUpRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LatencyChart } from "@/components/endpoints/latency-chart";
import { initialMockEndpoints } from "@/features/endpoints/mock/endpoints.data";
import { mock24hLatencyData, mockDashboardMetrics } from "@/features/dashboard/mock/dashboard.data";

export default function DashboardOverviewPage() {
  const [endpoints] = React.useState(initialMockEndpoints);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Overview"
        description="Real-time uptime metrics, health status, and latency across your workspaces."
      >
        <Button render={<Link href="/endpoints/new" />} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Endpoint
        </Button>
      </PageHeader>

      {/* Active Incident Callout Banner */}
      {mockDashboardMetrics.activeIncident && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-500 shrink-0">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                  Active Downtime: {mockDashboardMetrics.activeIncident.endpointName}
                </span>
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5 uppercase font-mono">
                  DOWN
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {mockDashboardMetrics.activeIncident.reason} • Started {mockDashboardMetrics.activeIncident.startedAt}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" render={<Link href={`/endpoints/${mockDashboardMetrics.activeIncident.endpointId}`} />} className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs shrink-0">
            Investigate Incident
          </Button>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monitored Endpoints"
          value={mockDashboardMetrics.totalEndpoints}
          description="Total active monitored services"
          icon={<Radio className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Healthy (UP)"
          value={mockDashboardMetrics.healthyCount}
          description="Meeting SLA availability"
          icon={<CheckCircle className="h-4 w-4 text-emerald-500" />}
          trend={{ value: "+100% SLA", isPositive: true }}
        />
        <StatCard
          title="Active Outages"
          value={mockDashboardMetrics.downCount}
          description="Endpoints failing assertions"
          icon={<AlertTriangle className="h-4 w-4 text-rose-500" />}
          trend={{ value: "Action Required", isPositive: false }}
        />
        <StatCard
          title="Average Latency"
          value={`${mockDashboardMetrics.avgResponseTimeMs} ms`}
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
            Avg: {mockDashboardMetrics.avgResponseTimeMs}ms
          </Badge>
        </CardHeader>
        <CardContent className="pt-2 pb-6 px-4">
          <LatencyChart data={mock24hLatencyData} height={220} />
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Method</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead className="hidden sm:table-cell">30d Uptime</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {endpoints.map((ep) => (
                <TableRow key={ep.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/endpoints/${ep.id}`}
                      className="hover:underline flex flex-col"
                    >
                      <span className="font-semibold text-foreground text-sm">
                        {ep.name}
                      </span>
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
                  <TableCell className="font-mono text-xs">{ep.latency}</TableCell>
                  <TableCell className="hidden sm:table-cell font-mono text-xs font-medium text-emerald-500">
                    {ep.uptime30d}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" render={<Link href={`/endpoints/${ep.id}`} />}>
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

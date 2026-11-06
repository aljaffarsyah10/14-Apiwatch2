"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Radio, CheckCircle, AlertTriangle, Clock, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const demoEndpoints = [
  {
    id: "ep-1",
    name: "Stripe Webhook Gateway",
    url: "https://api.stripe.com/v1/events",
    method: "POST",
    status: "UP" as const,
    latency: "84ms",
    uptime: "99.98%",
  },
  {
    id: "ep-2",
    name: "User Authentication Service",
    url: "https://auth.apiwatch.dev/v1/verify",
    method: "GET",
    status: "UP" as const,
    latency: "112ms",
    uptime: "100.0%",
  },
  {
    id: "ep-3",
    name: "Database Ingestion API",
    url: "https://data.apiwatch.dev/v1/ingest",
    method: "POST",
    status: "DOWN" as const,
    latency: "1,240ms",
    uptime: "98.42%",
  },
  {
    id: "ep-4",
    name: "Notification Dispatcher",
    url: "https://notify.apiwatch.dev/health",
    method: "GET",
    status: "PAUSED" as const,
    latency: "—",
    uptime: "99.50%",
  },
];

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Real-time health overview and performance metrics across all workspaces."
      >
        <Button render={<Link href="/endpoints/new" />} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Endpoint
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monitored Endpoints"
          value="4"
          description="Total active endpoints"
          icon={<Radio className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Healthy (UP)"
          value="2"
          description="Meeting SLA standards"
          icon={<CheckCircle className="h-4 w-4 text-emerald-500" />}
          trend={{ value: "+100%", isPositive: true }}
        />
        <StatCard
          title="Incidents / DOWN"
          value="1"
          description="1 endpoint failing checks"
          icon={<AlertTriangle className="h-4 w-4 text-rose-500" />}
          trend={{ value: "Action Required", isPositive: false }}
        />
        <StatCard
          title="Avg. Response Time"
          value="134ms"
          description="Weighted 24-hour latency"
          icon={<Clock className="h-4 w-4 text-amber-500" />}
        />
      </div>

      <Card className="border border-border">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-base font-semibold">Active Endpoints</CardTitle>
            <CardDescription className="text-xs">
              Quick status summary of registered endpoints.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" render={<Link href="/endpoints" />} className="gap-1 text-xs">
            View All <ArrowUpRight className="h-3.5 w-3.5" />
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
              {demoEndpoints.map((ep) => (
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
                    {ep.uptime}
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

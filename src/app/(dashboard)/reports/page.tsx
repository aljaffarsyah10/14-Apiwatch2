"use client";

import * as React from "react";
import Link from "next/link";
import { Download, RefreshCw, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { getReportsData, ReportsData } from "@/lib/api/reports";
import { toast } from "sonner";

export default function ReportsPage() {
  const [data, setData] = React.useState<ReportsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
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
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load reports");
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [refreshIndex]);

  const handleRefresh = React.useCallback(() => {
    setIsLoading(true);
    setRefreshIndex((prev) => prev + 1);
  }, []);

  const handleExport = () => {
    if (!data || data.endpoints.length === 0) {
      toast.info("No monitoring data to export.");
      return;
    }

    const headers = ["Endpoint Name", "Method", "URL", "Status", "Uptime %", "Avg Latency (ms)", "Total Checks"];
    const rows = data.endpoints.map((e) => [
      `"${e.name.replace(/"/g, '""')}"`,
      e.method,
      `"${e.url}"`,
      e.status,
      `${e.uptimePercentage}%`,
      e.avgResponseTime,
      e.totalChecks,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `apiwatch-uptime-report-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV report downloaded successfully.");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Uptime Reports"
          description="Availability metrics, downtime summary, and latency percentiles."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Could not load reports"
        description={error || "An error occurred while computing report metrics"}
        onRetry={handleRefresh}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Uptime Reports"
        description="Availability metrics, downtime summary, and latency performance across all endpoints."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 text-xs">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-emerald-500" />
              SLA Availability Compliance
            </CardTitle>
            <CardDescription className="text-xs">
              Weighted uptime percentage calculated from recent health checks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-muted-foreground">Overall Uptime</span>
              <span className="font-mono text-3xl font-bold text-emerald-500">
                {data.overallUptime}%
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(data.overallUptime, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Evaluated across {data.totalEndpoints} registered endpoint{data.totalEndpoints !== 1 ? "s" : ""}.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base">Latency Performance</CardTitle>
            <CardDescription className="text-xs">
              Response times across monitored endpoints.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-mono text-sm">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Average Probe Latency:</span>
              <span className="font-semibold text-foreground">{data.overallAvgLatency} ms</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Total Monitored Services:</span>
              <span className="font-semibold text-foreground">{data.totalEndpoints}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Service Performance Breakdown</CardTitle>
          <CardDescription className="text-xs">
            Individual endpoint availability and average latency metrics.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data.endpoints.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No endpoints monitored yet. Add endpoints to start collecting SLA reports.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uptime %</TableHead>
                  <TableHead>Avg Latency</TableHead>
                  <TableHead>Checks Evaluated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.endpoints.map((ep) => (
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
                    <TableCell className="font-mono text-xs font-semibold text-emerald-500">
                      {ep.uptimePercentage}%
                    </TableCell>
                    <TableCell className="font-mono text-xs">{ep.avgResponseTime} ms</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {ep.successfulChecks} / {ep.totalChecks} ({ep.failedChecks} failed)
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" render={<Link href={`/endpoints/${ep.id}`} />}>
                        View Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

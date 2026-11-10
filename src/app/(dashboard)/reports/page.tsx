"use client";

import * as React from "react";
import Link from "next/link";
import { Download, RefreshCw, BarChart2, Calendar } from "lucide-react";
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
  const [period, setPeriod] = React.useState<"24h" | "7d" | "30d">("30d");
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

  const handleExportCsv = () => {
    toast.info("Preparing safe CSV export...");
    const downloadUrl = `/api/reports/export?period=${period}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", `apiwatch-report-${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export initiated with injection defense.");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Uptime Reports"
          description="Availability metrics, downtime summary, and latency percentiles."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LoadingSkeleton type="card" />
          <LoadingSkeleton type="card" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Could not load reports"
        message={error || "An error occurred while computing report metrics"}
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
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs">
            <button
              onClick={() => setPeriod("24h")}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                period === "24h" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              24h
            </button>
            <button
              onClick={() => setPeriod("7d")}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                period === "7d" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              7d
            </button>
            <button
              onClick={() => setPeriod("30d")}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                period === "30d" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              30d
            </button>
          </div>

          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw />
            Refresh
          </Button>

          <Button variant="outline" onClick={handleExportCsv} className="gap-2">
            <Download className="h-4 w-4" />
            Export Safe CSV
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-success" />
              SLA Availability Compliance ({period.toUpperCase()})
            </CardTitle>
            <CardDescription>
              Weighted uptime percentage calculated from recent health checks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-muted-foreground">Overall Uptime</span>
              <span className="font-mono text-3xl font-bold text-success">
                {data.overallUptime}%
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all duration-500"
                style={{ width: `${Math.min(data.overallUptime, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Evaluated across {data.totalEndpoints} registered endpoint{data.totalEndpoints !== 1 ? "s" : ""}.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Latency Performance
            </CardTitle>
            <CardDescription>
              Aggregate response times across monitored services.
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
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">CSV Injection Defense:</span>
              <span className="font-semibold text-success">Enabled (CWE-1236)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service Performance Breakdown</CardTitle>
          <CardDescription>
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
                    <TableCell className="tabular-nums text-sm font-semibold text-success">
                      {ep.uptimePercentage}%
                    </TableCell>
                    <TableCell className="tabular-nums text-sm font-medium">{ep.avgResponseTime} ms</TableCell>
                    <TableCell className="tabular-nums text-sm text-muted-foreground">
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

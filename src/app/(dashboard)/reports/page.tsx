"use client";

import * as React from "react";
import Link from "next/link";
import {
  Download,
  RefreshCw,
  BarChart2,
  Calendar,
  Search,
  X,
  ArrowUpDown,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [search, setSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"name" | "uptime" | "latency">("uptime");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = React.useState(0);

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setIsLoading(true);
        const res = await getReportsData(period);
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
  }, [period, refreshIndex]);

  const handleRefresh = React.useCallback(() => {
    setRefreshIndex((prev) => prev + 1);
  }, []);

  const handleExportCsv = () => {
    toast.info(`Preparing safe CSV export for ${period}...`);
    const downloadUrl = `/api/reports/export?period=${period}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", `apiwatch-report-${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export initiated with injection defense.");
  };

  const toggleSort = (column: "name" | "uptime" | "latency") => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder(column === "name" ? "asc" : "desc");
    }
  };

  const filteredAndSortedEndpoints = (data?.endpoints || [])
    .filter((ep) => {
      if (
        search &&
        !ep.name.toLowerCase().includes(search.toLowerCase()) &&
        !ep.url.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "uptime") {
        comparison = a.uptimePercentage - b.uptimePercentage;
      } else if (sortBy === "latency") {
        comparison = a.avgResponseTime - b.avgResponseTime;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  if (isLoading && !data) {
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
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Timeframe selector pills */}
          <div className="flex items-center rounded-lg border border-border/80 bg-muted/40 p-1 text-xs">
            {(["24h", "7d", "30d"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  period === p
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={handleRefresh} className="h-9 gap-1.5 border-border/80">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportCsv} className="h-9 gap-1.5 border-border/80">
            <Download className="h-3.5 w-3.5" />
            Export Safe CSV
          </Button>
        </div>
      </PageHeader>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SLA Compliance Card */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-emerald-500" />
              SLA Availability Compliance ({period.toUpperCase()})
            </CardTitle>
            <CardDescription className="text-xs">
              Weighted uptime percentage calculated from recent health checks in this period.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Overall Uptime
              </span>
              <span className="font-mono text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {data.overallUptime}%
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted/60 overflow-hidden border border-border/40">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(data.overallUptime, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>Evaluated across {data.totalEndpoints} active endpoint{data.totalEndpoints !== 1 ? "s" : ""}</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {data.overallUptime >= 99.9 ? "SLA Target Met" : "Degraded Availability"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Latency Performance Card */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Response Performance ({period.toUpperCase()})
            </CardTitle>
            <CardDescription className="text-xs">
              Aggregate response times and verification status across monitored services.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-mono text-xs sm:text-sm">
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground font-sans">Average Probe Latency:</span>
              <span className="font-semibold text-foreground tabular-nums">{data.overallAvgLatency} ms</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground font-sans">Total Monitored Services:</span>
              <span className="font-semibold text-foreground tabular-nums">{data.totalEndpoints}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground font-sans">CSV Injection Defense:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> CWE-1236 Guard
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Table Card */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold">Service Performance Breakdown</CardTitle>
            <CardDescription className="text-xs">
              Individual endpoint availability and average latency metrics for {period}.
            </CardDescription>
          </div>

          {/* Search Input within reports */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search in report..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-7 h-8 text-xs bg-card/60"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-2 p-0.5 rounded-full hover:bg-muted text-muted-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredAndSortedEndpoints.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No endpoints match your query for this timeframe.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[32%] cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    <div className="flex items-center gap-1.5">
                      <span>Endpoint</span>
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("uptime")}>
                    <div className="flex items-center gap-1.5">
                      <span>Uptime %</span>
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("latency")}>
                    <div className="flex items-center gap-1.5">
                      <span>Avg Latency</span>
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Checks Evaluated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedEndpoints.map((ep) => (
                  <TableRow key={ep.id} className="transition-colors hover:bg-muted/40">
                    <TableCell className="font-medium">
                      <Link href={`/endpoints/${ep.id}`} className="group flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
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
                    <TableCell className="tabular-nums text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {ep.uptimePercentage}%
                    </TableCell>
                    <TableCell className="tabular-nums text-xs font-mono font-medium">
                      {ep.avgResponseTime} ms
                    </TableCell>
                    <TableCell className="hidden sm:table-cell tabular-nums text-xs text-muted-foreground">
                      {ep.successfulChecks} / {ep.totalChecks} ({ep.failedChecks} failed)
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" render={<Link href={`/endpoints/${ep.id}`} />} className="text-xs text-primary hover:text-primary hover:bg-primary/10">
                        View Details
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

"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
  X,
  Download,
  Clock,
  ExternalLink,
  Play,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { triggerManualCheck } from "@/lib/api/endpoints";
import { toast } from "sonner";

interface IncidentRecord {
  id: string;
  endpointId: string;
  status: "OPEN" | "RESOLVED";
  startedAt: string;
  resolvedAt: string | null;
  failureReason: string | null;
  endpoint: {
    id: string;
    name: string;
    url: string;
  };
}

function formatDuration(startedAt: string, resolvedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
  const diffSec = Math.max(0, Math.floor((end - start) / 1000));

  if (diffSec < 60) return `${diffSec}s`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ${diffSec % 60}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = React.useState<IncidentRecord[]>([]);
  const [filter, setFilter] = React.useState<"ALL" | "OPEN" | "RESOLVED">("ALL");
  const [search, setSearch] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = React.useState(0);
  const [checkingEndpointId, setCheckingEndpointId] = React.useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = React.useState(false);

  // Auto-refresh interval (30s)
  React.useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => {
      setRefreshIndex((prev) => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefreshEnabled]);

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/incidents", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load incidents");
        if (!ignore) {
          setIncidents(data.data || []);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load incidents");
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

  const handleTriggerProbe = async (endpointId: string, endpointName: string) => {
    try {
      setCheckingEndpointId(endpointId);
      toast.info(`Triggering verification probe for "${endpointName}"...`);
      await triggerManualCheck(endpointId);
      toast.success(`Check triggered! Refreshing status...`);
      setTimeout(() => {
        handleRefresh();
      }, 700);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Probe execution failed");
    } finally {
      setCheckingEndpointId(null);
    }
  };

  const handleExportCSV = () => {
    const sanitize = (val: string | number | null | undefined) => {
      const str = String(val ?? "");
      if (str.length > 0 && ["=", "+", "-", "@", "\t", "\r"].includes(str[0])) {
        return `"'${str.replace(/"/g, '""')}"`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ["ID", "EndpointName", "URL", "Status", "StartedAt", "ResolvedAt", "Duration", "RootCause"];
    const rows = filteredIncidents.map((inc) => [
      sanitize(inc.id),
      sanitize(inc.endpoint.name),
      sanitize(inc.endpoint.url),
      sanitize(inc.status),
      sanitize(inc.startedAt),
      sanitize(inc.resolvedAt ?? ""),
      sanitize(formatDuration(inc.startedAt, inc.resolvedAt)),
      sanitize(inc.failureReason ?? "Health check assertions failed"),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `apiwatch-incidents-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredIncidents.length} incident record(s) as safe CSV.`);
  };

  const counts = {
    all: incidents.length,
    open: incidents.filter((i) => i.status === "OPEN").length,
    resolved: incidents.filter((i) => i.status === "RESOLVED").length,
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (filter !== "ALL" && inc.status !== filter) return false;
    if (search) {
      const query = search.toLowerCase();
      const matchesName = inc.endpoint.name.toLowerCase().includes(query);
      const matchesUrl = inc.endpoint.url.toLowerCase().includes(query);
      const matchesReason = (inc.failureReason || "").toLowerCase().includes(query);
      if (!matchesName && !matchesUrl && !matchesReason) return false;
    }
    return true;
  });

  if (isLoading && incidents.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Downtime & Incidents"
          description="Historical log of service outages, failure reasons, and resolution times."
        />
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="table" />
      </div>
    );
  }

  if (error && incidents.length === 0) {
    return (
      <ErrorState
        title="Could not load incidents"
        description={error}
        onRetry={handleRefresh}
      />
    );
  }

  const activeIncidents = incidents.filter((i) => i.status === "OPEN");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Downtime & Incidents"
        description="Historical log of service outages, failure reasons, and resolution times."
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Auto-refresh pill toggle */}
          <button
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
              autoRefreshEnabled
                ? "bg-primary/10 border-primary/30 text-primary shadow-xs"
                : "border-border/80 text-muted-foreground hover:bg-muted/60"
            }`}
            title="Auto-refresh incidents every 30 seconds"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                autoRefreshEnabled ? "bg-primary animate-pulse" : "bg-muted-foreground/50"
              }`}
            />
            <span>Auto-refresh (30s)</span>
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 gap-1.5 text-xs border-border/80"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>

          <Button variant="outline" size="sm" onClick={handleRefresh} className="h-9 gap-1.5 border-border/80">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {/* Active Outage Banner if any exist */}
      {activeIncidents.length > 0 && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-destructive/20 text-destructive shrink-0">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  Active Service Outage: {activeIncidents[0].endpoint.name}
                </h3>
                <Badge variant="destructive" className="text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  ONGOING • {formatDuration(activeIncidents[0].startedAt, null)}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {activeIncidents[0].failureReason || "Failing assertion validation checks"} • Started{" "}
                {new Date(activeIncidents[0].startedAt).toLocaleString()}. Automated alert notifications dispatched.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTriggerProbe(activeIncidents[0].endpointId, activeIncidents[0].endpoint.name)}
              disabled={checkingEndpointId === activeIncidents[0].endpointId}
              className="h-8 text-xs gap-1.5 border-destructive/30 bg-background/80"
            >
              {checkingEndpointId === activeIncidents[0].endpointId ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3 text-emerald-500" />
              )}
              Verify Now
            </Button>
            <Button
              size="sm"
              variant="destructive"
              render={<Link href={`/endpoints/${activeIncidents[0].endpointId}`} />}
              className="h-8 text-xs font-semibold shadow-xs"
            >
              Investigate
            </Button>
          </div>
        </div>
      )}

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <Tabs value={filter} onValueChange={(val) => setFilter(val as "ALL" | "OPEN" | "RESOLVED")} className="w-auto">
          <TabsList className="bg-muted/50 p-1 border border-border/60">
            <TabsTrigger value="ALL" className="gap-1.5 text-xs font-semibold">
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="OPEN" className="gap-1.5 text-xs font-semibold">
              Active Outages ({counts.open})
            </TabsTrigger>
            <TabsTrigger value="RESOLVED" className="gap-1.5 text-xs font-semibold">
              Resolved ({counts.resolved})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search endpoint or root cause..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9.5 pr-8 h-9 text-xs sm:text-sm bg-card/60"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Incident History Table Card */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Incident Log Audit Trail</CardTitle>
            <CardDescription className="text-xs">
              Chronological log of downtime events, duration, and resolution timestamps.
            </CardDescription>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            Showing {filteredIncidents.length} event{filteredIncidents.length !== 1 ? "s" : ""}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {filteredIncidents.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<CheckCircle className="h-10 w-10 text-emerald-500" />}
                title={search || filter !== "ALL" ? "No matching incidents" : "No incidents recorded"}
                description={
                  search || filter !== "ALL"
                    ? "Try adjusting your search query or status filter."
                    : "All monitored services are operating normally with 100% uptime compliance."
                }
                action={
                  search || filter !== "ALL"
                    ? {
                        label: "Clear Filters",
                        onClick: () => {
                          setFilter("ALL");
                          setSearch("");
                        },
                      }
                    : undefined
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[28%]">Endpoint</TableHead>
                  <TableHead>Outage Started</TableHead>
                  <TableHead className="hidden sm:table-cell">Resolved At</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="hidden md:table-cell">Root Cause</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.map((inc) => (
                  <TableRow key={inc.id} className="transition-colors hover:bg-muted/40">
                    <TableCell className="font-semibold text-sm">
                      <Link
                        href={`/endpoints/${inc.endpointId}`}
                        className="group flex items-center gap-1.5 text-foreground hover:text-primary transition-colors"
                      >
                        <span className="truncate max-w-xs">{inc.endpoint.name}</span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </TableCell>

                    <TableCell className="text-muted-foreground text-xs tabular-nums">
                      {new Date(inc.startedAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>

                    <TableCell className="hidden sm:table-cell text-muted-foreground text-xs tabular-nums">
                      {inc.resolvedAt
                        ? new Date(inc.resolvedAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Ongoing"}
                    </TableCell>

                    <TableCell className="tabular-nums text-xs font-semibold">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {formatDuration(inc.startedAt, inc.resolvedAt)}
                      </span>
                    </TableCell>

                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs truncate max-w-xs">
                      {inc.failureReason || "Assertion criteria failed"}
                    </TableCell>

                    <TableCell className="text-right">
                      {inc.status === "OPEN" ? (
                        <Badge variant="destructive" className="text-[11px] font-semibold px-2 py-0.5 rounded-full">
                          OPEN
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        >
                          RESOLVED
                        </Badge>
                      )}
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

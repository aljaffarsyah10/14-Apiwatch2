"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Pause,
  Play,
  Trash2,
  Edit,
  Radio,
  RefreshCw,
  Loader2,
  ShieldCheck,
  X,
  Copy,
  Download,
  ArrowUpDown,
  CheckSquare,
  Square,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getEndpoints,
  pauseEndpoint,
  resumeEndpoint,
  deleteEndpoint,
  checkAllEndpoints,
  bulkEndpointAction,
  cloneEndpoint,
  EndpointItem,
} from "@/lib/api/endpoints";

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
  return <span className={`font-mono font-semibold text-xs tabular-nums ${colorClass}`}>{rounded} ms</span>;
}

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = React.useState<EndpointItem[]>([]);
  const [filter, setFilter] = React.useState("ALL");
  const [methodFilter, setMethodFilter] = React.useState("ALL");
  const [sortBy, setSortBy] = React.useState<"name" | "latency" | "interval" | "status">("name");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  const [search, setSearch] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [deleteEndpointTarget, setDeleteEndpointTarget] = React.useState<EndpointItem | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = React.useState(0);
  const [isCheckingAll, setIsCheckingAll] = React.useState(false);
  const [isExecutingBulk, setIsExecutingBulk] = React.useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Auto-refresh interval (30s)
  React.useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => {
      setRefreshIndex((prev) => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefreshEnabled]);

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
        const data = await getEndpoints();
        if (!ignore) {
          setEndpoints(data);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load endpoints");
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

  // Filter & Search Logic
  const filteredEndpoints = endpoints.filter((ep) => {
    if (filter !== "ALL" && ep.status !== filter) return false;
    if (methodFilter !== "ALL" && ep.method.toUpperCase() !== methodFilter) return false;
    if (
      search &&
      !ep.name.toLowerCase().includes(search.toLowerCase()) &&
      !ep.url.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Sort Logic
  const sortedEndpoints = [...filteredEndpoints].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === "status") {
      comparison = a.status.localeCompare(b.status);
    } else if (sortBy === "interval") {
      comparison = a.intervalSeconds - b.intervalSeconds;
    } else if (sortBy === "latency") {
      const latA = a.checks?.[0]?.responseTimeMs ?? 999999;
      const latB = b.checks?.[0]?.responseTimeMs ?? 999999;
      comparison = latA - latB;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const totalPages = Math.max(1, Math.ceil(sortedEndpoints.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedEndpoints = sortedEndpoints.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  const toggleSort = (column: "name" | "latency" | "interval" | "status") => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.length === filteredEndpoints.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEndpoints.map((ep) => ep.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk operations
  const handleBulkAction = async (action: "pause" | "resume" | "check" | "delete") => {
    if (selectedIds.length === 0) return;
    if (action === "delete") {
      setIsBulkDeleteDialogOpen(true);
      return;
    }

    try {
      setIsExecutingBulk(true);
      const res = await bulkEndpointAction(action, selectedIds);
      toast.success(res.message);
      if (action !== "check") setSelectedIds([]);
      handleRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Bulk action failed");
    } finally {
      setIsExecutingBulk(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      setIsExecutingBulk(true);
      const res = await bulkEndpointAction("delete", selectedIds);
      toast.success(res.message);
      setSelectedIds([]);
      setIsBulkDeleteDialogOpen(false);
      handleRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete endpoints");
    } finally {
      setIsExecutingBulk(false);
    }
  };

  // Clone endpoint handler
  const handleClone = async (ep: EndpointItem) => {
    try {
      toast.info(`Cloning "${ep.name}"...`);
      const res = await cloneEndpoint(ep.id);
      toast.success(res.message);
      handleRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to clone endpoint");
    }
  };

  const handleTogglePause = async (ep: EndpointItem) => {
    const isCurrentlyPaused = ep.status === "PAUSED";
    try {
      if (isCurrentlyPaused) {
        await resumeEndpoint(ep.id);
        toast.success(`Endpoint "${ep.name}" has been resumed.`);
      } else {
        await pauseEndpoint(ep.id);
        toast.success(`Endpoint "${ep.name}" has been paused.`);
      }
      handleRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to change endpoint status");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteEndpointTarget) return;
    try {
      await deleteEndpoint(deleteEndpointTarget.id);
      toast.success(`Endpoint "${deleteEndpointTarget.name}" has been deleted.`);
      setDeleteEndpointTarget(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteEndpointTarget.id));
      handleRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete endpoint");
    }
  };

  // Client-side Export handlers
  const handleExportJSON = () => {
    const dataToExport = selectedIds.length > 0
      ? endpoints.filter((e) => selectedIds.includes(e.id))
      : filteredEndpoints;

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `apiwatch-endpoints-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${dataToExport.length} endpoint(s) as JSON.`);
  };

  const handleExportCSV = () => {
    const dataToExport = selectedIds.length > 0
      ? endpoints.filter((e) => selectedIds.includes(e.id))
      : filteredEndpoints;

    const sanitize = (val: string | number | null | undefined) => {
      const str = String(val ?? "");
      // CWE-1236 defense: neutralize spreadsheet formula injection
      if (str.length > 0 && ["=", "+", "-", "@", "\t", "\r"].includes(str[0])) {
        return `"'${str.replace(/"/g, '""')}"`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ["ID", "Name", "URL", "Method", "Status", "IntervalSeconds", "LatestLatencyMs"];
    const rows = dataToExport.map((ep) => [
      sanitize(ep.id),
      sanitize(ep.name),
      sanitize(ep.url),
      sanitize(ep.method),
      sanitize(ep.status),
      sanitize(ep.intervalSeconds),
      sanitize(ep.checks?.[0]?.responseTimeMs ?? ""),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `apiwatch-endpoints-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${dataToExport.length} endpoint(s) as safe CSV.`);
  };

  const counts = {
    all: endpoints.length,
    up: endpoints.filter((e) => e.status === "UP").length,
    down: endpoints.filter((e) => e.status === "DOWN").length,
    paused: endpoints.filter((e) => e.status === "PAUSED").length,
  };

  if (isLoading && endpoints.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Endpoints"
          description="Manage your HTTP/HTTPS endpoints, intervals, and health assertions."
        />
        <LoadingSkeleton variant="table" />
      </div>
    );
  }

  if (error && endpoints.length === 0) {
    return (
      <ErrorState
        title="Could not load endpoints"
        description={error}
        onRetry={handleRefresh}
      />
    );
  }

  const isAllSelected =
    filteredEndpoints.length > 0 && selectedIds.length === filteredEndpoints.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Endpoints"
        description="Manage your HTTP/HTTPS endpoints, intervals, and health assertions."
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
            title="Auto-refresh list every 30 seconds"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                autoRefreshEnabled ? "bg-primary animate-pulse" : "bg-muted-foreground/50"
              }`}
            />
            <span>Auto-refresh (30s)</span>
          </button>

          {/* Export button with dropdown/direct actions */}
          <div className="flex items-center rounded-lg border border-border/80 bg-card p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportCSV}
              className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground px-2.5"
              title="Export as CSV"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <div className="h-4 w-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportJSON}
              className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground px-2.5"
              title="Export as JSON"
            >
              JSON
            </Button>
          </div>

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
            <span>{isCheckingAll ? "Executing..." : "Check All"}</span>
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

      {/* Bulk Actions Floating Toolbar */}
      {selectedIds.length > 0 && (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md backdrop-blur-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span>
              {selectedIds.length} of {filteredEndpoints.length} endpoint{selectedIds.length > 1 ? "s" : ""} selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("check")}
              disabled={isExecutingBulk}
              className="h-8 text-xs gap-1.5 border-primary/30 bg-background/80 hover:bg-background"
            >
              {isExecutingBulk ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 text-emerald-500" />}
              Run Checks
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("pause")}
              disabled={isExecutingBulk}
              className="h-8 text-xs gap-1.5 border-primary/30 bg-background/80 hover:bg-background"
            >
              <Pause className="h-3 w-3 text-amber-500" />
              Pause
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("resume")}
              disabled={isExecutingBulk}
              className="h-8 text-xs gap-1.5 border-primary/30 bg-background/80 hover:bg-background"
            >
              <Play className="h-3 w-3 text-emerald-500" />
              Resume
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBulkAction("delete")}
              disabled={isExecutingBulk}
              className="h-8 text-xs gap-1.5 shadow-2xs"
            >
              <Trash2 className="h-3 w-3" />
              Delete Selected
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              Deselect
            </Button>
          </div>
        </div>
      )}

      {/* Filter, Method Selector, and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Status Tabs */}
        <Tabs value={filter} onValueChange={setFilter} className="w-auto">
          <TabsList className="bg-muted/50 p-1 border border-border/60">
            <TabsTrigger value="ALL" className="gap-1.5 text-xs font-semibold">
              All <Badge variant="secondary" className="px-1.5 py-0 text-[10px] rounded-full">{counts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="UP" className="gap-1.5 text-xs font-semibold">
              UP <Badge variant="secondary" className="px-1.5 py-0 text-[10px] rounded-full text-emerald-600 dark:text-emerald-400">{counts.up}</Badge>
            </TabsTrigger>
            <TabsTrigger value="DOWN" className="gap-1.5 text-xs font-semibold">
              DOWN <Badge variant="secondary" className="px-1.5 py-0 text-[10px] rounded-full text-rose-600 dark:text-rose-400">{counts.down}</Badge>
            </TabsTrigger>
            <TabsTrigger value="PAUSED" className="gap-1.5 text-xs font-semibold">
              PAUSED <Badge variant="secondary" className="px-1.5 py-0 text-[10px] rounded-full text-amber-600 dark:text-amber-400">{counts.paused}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search, Method Filter & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Method Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline-block" />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="h-9 rounded-lg border border-border/80 bg-card px-2.5 text-xs font-semibold shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search endpoint or URL..."
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
      </div>

      {/* Endpoints Table Card */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {sortedEndpoints.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<Radio className="h-10 w-10 text-muted-foreground" />}
                title={search || filter !== "ALL" || methodFilter !== "ALL" ? "No matching endpoints" : "No endpoints configured"}
                description={
                  search || filter !== "ALL" || methodFilter !== "ALL"
                    ? "Try adjusting your search query, status filter, or HTTP method to see other endpoints."
                    : "Register your first API endpoint to start automated uptime monitoring and incident alerting."
                }
                action={
                  search || filter !== "ALL" || methodFilter !== "ALL"
                    ? {
                        label: "Clear Filters",
                        onClick: () => {
                          setFilter("ALL");
                          setMethodFilter("ALL");
                          setSearch("");
                        },
                      }
                    : {
                        label: "Create First Endpoint",
                        href: "/endpoints/new",
                      }
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {/* Select All Checkbox */}
                  <TableHead className="w-10">
                    <button
                      onClick={handleSelectAll}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      title={isAllSelected ? "Deselect All" : "Select All"}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </TableHead>

                  {/* Endpoint Name Column with Sort */}
                  <TableHead className="w-[32%] cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    <div className="flex items-center gap-1.5">
                      <span>Endpoint</span>
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TableHead>

                  {/* Status Column with Sort */}
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("status")}>
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TableHead>

                  <TableHead className="hidden md:table-cell">Method</TableHead>

                  {/* Interval Column with Sort */}
                  <TableHead className="hidden sm:table-cell cursor-pointer select-none" onClick={() => toggleSort("interval")}>
                    <div className="flex items-center gap-1.5">
                      <span>Interval</span>
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TableHead>

                  {/* Latency Column with Sort */}
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("latency")}>
                    <div className="flex items-center gap-1.5">
                      <span>Latest Latency</span>
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TableHead>

                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEndpoints.map((ep) => {
                  const latestCheck = ep.checks?.[0];
                  const isSelected = selectedIds.includes(ep.id);

                  return (
                    <TableRow
                      key={ep.id}
                      className={`transition-colors hover:bg-muted/40 ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      {/* Row Checkbox */}
                      <TableCell className="w-10">
                        <button
                          onClick={() => handleToggleSelect(ep.id)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>

                      <TableCell>
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

                      <TableCell className="hidden sm:table-cell tabular-nums text-xs text-muted-foreground">
                        {ep.intervalSeconds < 60 ? `${ep.intervalSeconds}s` : `${Math.round(ep.intervalSeconds / 60)}m`}
                      </TableCell>

                      <TableCell>
                        {getLatencyBadge(latestCheck?.responseTimeMs)}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Pause / Resume */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title={ep.status === "PAUSED" ? "Resume Monitoring" : "Pause Monitoring"}
                            onClick={() => handleTogglePause(ep)}
                          >
                            {ep.status === "PAUSED" ? (
                              <Play className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />
                            ) : (
                              <Pause className="h-4 w-4 text-amber-500 fill-amber-500/20" />
                            )}
                          </Button>

                          {/* Clone Endpoint */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Duplicate / Clone Endpoint"
                            onClick={() => handleClone(ep)}
                          >
                            <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>

                          {/* Edit Endpoint */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Edit Configuration"
                            render={<Link href={`/endpoints/${ep.id}/edit`} />}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          {/* Delete Endpoint */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Delete Endpoint"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteEndpointTarget(ep)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Table Pagination Bar */}
          {sortedEndpoints.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-t border-border/60 bg-muted/10 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>
                  Showing {Math.min((currentPage - 1) * pageSize + 1, sortedEndpoints.length)} to{" "}
                  {Math.min(currentPage * pageSize, sortedEndpoints.length)} of {sortedEndpoints.length} endpoints
                </span>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <span>Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="h-7 rounded border border-border/80 bg-card px-1.5 text-xs font-semibold focus-visible:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span>per page</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="h-7 w-7 p-0"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="font-semibold text-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="h-7 w-7 p-0"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteEndpointTarget}
        onOpenChange={(open) => !open && setDeleteEndpointTarget(null)}
        title={`Delete "${deleteEndpointTarget?.name}"?`}
        description="Are you sure you want to delete this monitored endpoint? All monitoring history, incident records, and alert schedules will be permanently removed. This action cannot be undone."
        confirmText="Delete Endpoint"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />

      {/* Bulk Delete Confirm Dialog */}
      <ConfirmDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        title={`Delete ${selectedIds.length} Endpoints?`}
        description={`You are about to permanently delete ${selectedIds.length} monitored endpoints and all associated health check records and incident histories. This action cannot be reversed.`}
        confirmText={`Delete ${selectedIds.length} Endpoints`}
        variant="destructive"
        onConfirm={handleBulkDeleteConfirm}
      />
    </div>
  );
}

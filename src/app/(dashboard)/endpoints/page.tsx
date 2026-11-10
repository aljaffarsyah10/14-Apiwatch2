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
  const [search, setSearch] = React.useState("");
  const [deleteEndpointTarget, setDeleteEndpointTarget] = React.useState<EndpointItem | null>(null);
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

  const filteredEndpoints = endpoints.filter((ep) => {
    if (filter !== "ALL" && ep.status !== filter) return false;
    if (
      search &&
      !ep.name.toLowerCase().includes(search.toLowerCase()) &&
      !ep.url.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

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
      handleRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete endpoint");
    }
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Endpoints"
        description="Manage your HTTP/HTTPS endpoints, intervals, and health assertions."
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
            <span>{isCheckingAll ? "Executing..." : "Check All Now"}</span>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
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

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Filter endpoint name or URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9.5 pr-8 text-xs sm:text-sm bg-card/60"
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

      {/* Endpoints Table Card */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {filteredEndpoints.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<Radio className="h-10 w-10 text-muted-foreground" />}
                title={search || filter !== "ALL" ? "No matching endpoints" : "No endpoints configured"}
                description={
                  search || filter !== "ALL"
                    ? "Try adjusting your search query or status filter to see other endpoints."
                    : "Register your first API endpoint to start automated uptime monitoring and incident alerting."
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
                  <TableHead className="w-[35%]">Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Method</TableHead>
                  <TableHead className="hidden sm:table-cell">Interval</TableHead>
                  <TableHead>Latest Latency</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEndpoints.map((ep) => {
                  const latestCheck = ep.checks?.[0];
                  return (
                    <TableRow key={ep.id} className="transition-colors hover:bg-muted/40">
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
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Edit Configuration"
                            render={<Link href={`/endpoints/${ep.id}/edit`} />}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
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
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteEndpointTarget}
        onOpenChange={(open) => !open && setDeleteEndpointTarget(null)}
        title={`Delete "${deleteEndpointTarget?.name}"?`}
        description="Are you sure you want to delete this monitored endpoint? All monitoring history, incident records, and alert schedules will be permanently removed. This action cannot be undone."
        confirmText="Delete Endpoint"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, Pause, Play, Trash2, Edit, Radio, RefreshCw } from "lucide-react";
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
import { toast } from "sonner";
import {
  getEndpoints,
  pauseEndpoint,
  resumeEndpoint,
  deleteEndpoint,
  EndpointItem,
} from "@/lib/api/endpoints";

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = React.useState<EndpointItem[]>([]);
  const [filter, setFilter] = React.useState("ALL");
  const [search, setSearch] = React.useState("");
  const [deleteEndpointTarget, setDeleteEndpointTarget] = React.useState<EndpointItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = React.useState(0);

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
      // Re-fetch to reflect updated status
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

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <Tabs value={filter} onValueChange={setFilter} className="w-auto">
          <TabsList className="bg-muted/60">
            <TabsTrigger value="ALL">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="UP">UP ({counts.up})</TabsTrigger>
            <TabsTrigger value="DOWN">DOWN ({counts.down})</TabsTrigger>
            <TabsTrigger value="PAUSED">PAUSED ({counts.paused})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search endpoint name or URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
      </div>

      <Card className="border border-border">
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
                <TableRow>
                  <TableHead>Endpoint</TableHead>
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
                    <TableRow key={ep.id}>
                      <TableCell>
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
                      <TableCell className="hidden sm:table-cell font-mono text-xs">
                        {ep.intervalSeconds < 60 ? `${ep.intervalSeconds}s` : `${Math.round(ep.intervalSeconds / 60)}m`}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {latestCheck?.responseTimeMs !== undefined && latestCheck.responseTimeMs !== null
                          ? `${Math.round(latestCheck.responseTimeMs)} ms`
                          : "Pending"}
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
                              <Play className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Pause className="h-4 w-4 text-amber-500" />
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
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
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

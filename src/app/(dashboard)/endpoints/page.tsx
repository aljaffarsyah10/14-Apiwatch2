"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, Pause, Play, Trash2, Edit, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { initialMockEndpoints, MockEndpoint } from "@/features/endpoints/mock/endpoints.data";
import { toast } from "sonner";

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = React.useState<MockEndpoint[]>(initialMockEndpoints);
  const [filter, setFilter] = React.useState("ALL");
  const [search, setSearch] = React.useState("");
  const [deleteEndpointId, setDeleteEndpointId] = React.useState<string | null>(null);

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

  const handleTogglePause = (id: string) => {
    setEndpoints((prev) =>
      prev.map((ep) => {
        if (ep.id === id) {
          const nextStatus = ep.status === "PAUSED" ? "UP" : "PAUSED";
          toast.success(
            `Endpoint ${ep.name} is now ${nextStatus === "PAUSED" ? "paused" : "resumed"}.`
          );
          return {
            ...ep,
            status: nextStatus,
            isActive: nextStatus !== "PAUSED",
          };
        }
        return ep;
      })
    );
  };

  const handleDeleteConfirm = () => {
    if (!deleteEndpointId) return;
    const target = endpoints.find((e) => e.id === deleteEndpointId);
    setEndpoints((prev) => prev.filter((e) => e.id !== deleteEndpointId));
    toast.success(`Endpoint "${target?.name}" has been deleted.`);
    setDeleteEndpointId(null);
  };

  const counts = {
    all: endpoints.length,
    up: endpoints.filter((e) => e.status === "UP").length,
    down: endpoints.filter((e) => e.status === "DOWN").length,
    paused: endpoints.filter((e) => e.status === "PAUSED").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Endpoints"
        description="Manage your HTTP/HTTPS endpoints, intervals, and health assertions."
      >
        <Button render={<Link href="/endpoints/new" />} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Endpoint
        </Button>
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
            <div className="p-8">
              <EmptyState
                icon={<Radio className="h-8 w-8" />}
                title="No endpoints found"
                description={
                  search
                    ? `No endpoints matching "${search}".`
                    : "There are currently no endpoints in this category."
                }
                actionLabel={search ? "Clear Search" : "Create Endpoint"}
                onAction={search ? () => setSearch("") : undefined}
                actionHref={!search ? "/endpoints/new" : undefined}
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
                  <TableHead>Latency</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEndpoints.map((ep) => (
                  <TableRow key={ep.id}>
                    <TableCell>
                      <Link
                        href={`/endpoints/${ep.id}`}
                        className="hover:underline flex flex-col"
                      >
                        <span className="font-semibold text-foreground text-sm">
                          {ep.name}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground truncate max-w-sm">
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
                    <TableCell className="font-mono text-xs">{ep.intervalSeconds}s</TableCell>
                    <TableCell className="font-mono text-xs">{ep.latency}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTogglePause(ep.id)}
                          title={ep.status === "PAUSED" ? "Resume monitoring" : "Pause monitoring"}
                        >
                          {ep.status === "PAUSED" ? (
                            <Play className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Pause className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          render={<Link href={`/endpoints/${ep.id}/edit`} />}
                          title="Edit endpoint"
                        >
                          <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteEndpointId(ep.id)}
                          title="Delete endpoint"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteEndpointId)}
        onOpenChange={(open) => !open && setDeleteEndpointId(null)}
        title="Delete Endpoint"
        description="Are you sure you want to delete this endpoint? All associated check histories and uptime records will be permanently removed."
        confirmLabel="Delete Endpoint"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

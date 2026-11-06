"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const endpointsList = [
  {
    id: "ep-1",
    name: "Stripe Webhook Gateway",
    url: "https://api.stripe.com/v1/events",
    method: "POST",
    interval: "5m",
    status: "UP" as const,
    latency: "84ms",
  },
  {
    id: "ep-2",
    name: "User Authentication Service",
    url: "https://auth.apiwatch.dev/v1/verify",
    method: "GET",
    interval: "1m",
    status: "UP" as const,
    latency: "112ms",
  },
  {
    id: "ep-3",
    name: "Database Ingestion API",
    url: "https://data.apiwatch.dev/v1/ingest",
    method: "POST",
    interval: "5m",
    status: "DOWN" as const,
    latency: "1,240ms",
  },
  {
    id: "ep-4",
    name: "Notification Dispatcher",
    url: "https://notify.apiwatch.dev/health",
    method: "GET",
    interval: "10m",
    status: "PAUSED" as const,
    latency: "—",
  },
];

export default function EndpointsPage() {
  const [filter, setFilter] = React.useState("ALL");
  const [search, setSearch] = React.useState("");

  const filteredEndpoints = endpointsList.filter((ep) => {
    if (filter !== "ALL" && ep.status !== filter) return false;
    if (search && !ep.name.toLowerCase().includes(search.toLowerCase()) && !ep.url.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Endpoints"
        description="Manage your HTTP/HTTPS endpoints, intervals, and assertions."
      >
        <Button render={<Link href="/endpoints/new" />} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Endpoint
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <Tabs value={filter} onValueChange={setFilter} className="w-auto">
          <TabsList className="bg-muted/60">
            <TabsTrigger value="ALL">All ({endpointsList.length})</TabsTrigger>
            <TabsTrigger value="UP">UP (2)</TabsTrigger>
            <TabsTrigger value="DOWN">DOWN (1)</TabsTrigger>
            <TabsTrigger value="PAUSED">PAUSED (1)</TabsTrigger>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEndpoints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No endpoints match the current filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEndpoints.map((ep) => (
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
                    <TableCell className="font-mono text-xs font-semibold">
                      {ep.method}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{ep.interval}</TableCell>
                    <TableCell className="font-mono text-xs">{ep.latency}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" render={<Link href={`/endpoints/${ep.id}`} />}>
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

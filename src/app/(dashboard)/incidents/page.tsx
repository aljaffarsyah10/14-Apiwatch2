"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";

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

export default function IncidentsPage() {
  const [incidents, setIncidents] = React.useState<IncidentRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = React.useState(0);

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

  if (isLoading) {
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

  if (error) {
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
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </PageHeader>

      {/* Active Outage Banner if any exist */}
      {activeIncidents.length > 0 && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 flex items-start gap-4">
          <div className="p-2 rounded-lg bg-rose-500/20 text-rose-500 shrink-0">
            <AlertTriangle className="h-5 w-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                Active Outage: {activeIncidents[0].endpoint.name}
              </h3>
              <Badge variant="destructive" className="text-[10px]">
                ONGOING
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {activeIncidents[0].failureReason || "Failing health checks"} • Started{" "}
              {new Date(activeIncidents[0].startedAt).toLocaleString()}. Automatic alerts dispatched.
            </p>
          </div>
        </div>
      )}

      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base">Incident History</CardTitle>
          <CardDescription className="text-xs">
            Review previous downtime events and root causes across your services.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {incidents.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<CheckCircle className="h-10 w-10 text-emerald-500" />}
                title="No incidents recorded"
                description="All your monitored services are running smoothly without any recorded downtime events."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Root Cause</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((inc) => (
                  <TableRow key={inc.id}>
                    <TableCell className="font-semibold text-sm">
                      <Link href={`/endpoints/${inc.endpointId}`} className="hover:underline">
                        {inc.endpoint.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {new Date(inc.startedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {inc.resolvedAt ? new Date(inc.resolvedAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {inc.failureReason || "Health check failed"}
                    </TableCell>
                    <TableCell className="text-right">
                      {inc.status === "OPEN" ? (
                        <Badge variant="destructive" className="text-[10px]">
                          OPEN
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-emerald-500 border-emerald-500/30 text-[10px]"
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

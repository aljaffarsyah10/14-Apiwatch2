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
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw />
          Refresh
        </Button>
      </PageHeader>

      {/* Active Outage Banner if any exist */}
      {activeIncidents.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 flex items-start gap-4">
          <div className="p-2 rounded-lg bg-destructive/20 text-destructive shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-destructive">
                Active Outage: {activeIncidents[0].endpoint.name}
              </h3>
              <Badge variant="destructive" className="text-xs font-semibold">
                ONGOING
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {activeIncidents[0].failureReason || "Failing health checks"} • Started{" "}
              {new Date(activeIncidents[0].startedAt).toLocaleString()}. Automatic alerts dispatched.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Incident History</CardTitle>
          <CardDescription>
            Review previous downtime events and root causes across your services.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {incidents.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<CheckCircle className="h-10 w-10 text-success" />}
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
                      <Link href={`/endpoints/${inc.endpointId}`} className="hover:text-primary transition-colors">
                        {inc.endpoint.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {new Date(inc.startedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {inc.resolvedAt ? new Date(inc.resolvedAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {inc.failureReason || "Health check failed"}
                    </TableCell>
                    <TableCell className="text-right">
                      {inc.status === "OPEN" ? (
                        <Badge variant="destructive" className="text-xs">
                          OPEN
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-success border-success/30 text-xs"
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

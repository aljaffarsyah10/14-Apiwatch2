"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function IncidentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Downtime & Incidents"
        description="Historical log of service outages, failure reasons, and resolution times."
      />

      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 flex items-start gap-4">
        <div className="p-2 rounded-lg bg-rose-500/20 text-rose-500 shrink-0">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-rose-600 dark:text-rose-400">
              Active Incident: Database Ingestion API
            </h3>
            <Badge variant="outline" className="bg-rose-500/20 text-rose-500 border-rose-500/30 text-[10px]">
              ONGOING
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Endpoint timed out after 10,000ms. Started 14 minutes ago. Automatic email alert dispatched.
          </p>
        </div>
      </div>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base">Incident History</CardTitle>
          <CardDescription className="text-xs">
            Review previous downtime events and root causes.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Resolved</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Root Cause</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold text-sm">
                  Database Ingestion API
                </TableCell>
                <TableCell className="text-xs font-mono">Today, 22:15</TableCell>
                <TableCell className="text-xs font-mono">—</TableCell>
                <TableCell className="text-xs font-mono text-rose-500">14m ongoing</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  TIMEOUT (10,000ms exceeded)
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="destructive" className="text-[10px]">OPEN</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold text-sm">
                  Stripe Webhook Gateway
                </TableCell>
                <TableCell className="text-xs font-mono">Yesterday, 14:02</TableCell>
                <TableCell className="text-xs font-mono">Yesterday, 14:05</TableCell>
                <TableCell className="text-xs font-mono text-emerald-500">3m 12s</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  HTTP 502 Bad Gateway
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-[10px]">
                    RESOLVED
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

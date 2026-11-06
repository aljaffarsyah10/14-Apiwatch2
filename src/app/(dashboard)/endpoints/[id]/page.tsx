"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Play, Pause, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

function EndpointDetailContent() {
  const params = useParams();
  const endpointId = (params?.id as string) || "ep-1";

  const handleTriggerCheck = () => {
    toast.success("Manual health check queued successfully.");
  };

  const handleTogglePause = () => {
    toast.info("Endpoint status toggled.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/endpoints" />} className="gap-1.5 text-xs text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Endpoints
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Stripe Webhook Gateway
            </h1>
            <StatusBadge status="UP" />
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            POST https://api.stripe.com/v1/events • Interval: 5m • Timeout: 10,000ms
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={handleTriggerCheck} className="gap-1.5 text-xs">
            <Play className="h-3.5 w-3.5" />
            Run Check Now
          </Button>
          <Button size="sm" variant="outline" onClick={handleTogglePause} className="gap-1.5 text-xs">
            <Pause className="h-3.5 w-3.5" />
            Pause
          </Button>
          <Button size="sm" variant="outline" render={<Link href={`/endpoints/${endpointId}/edit`} />} className="gap-1.5 text-xs">
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Check History</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-border">
              <CardHeader className="py-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  30-Day SLA Uptime
                </CardTitle>
                <div className="text-2xl font-bold font-mono text-emerald-500 mt-1">
                  99.98%
                </div>
              </CardHeader>
            </Card>

            <Card className="border border-border">
              <CardHeader className="py-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Average Response Time
                </CardTitle>
                <div className="text-2xl font-bold font-mono text-foreground mt-1">
                  84 ms
                </div>
              </CardHeader>
            </Card>

            <Card className="border border-border">
              <CardHeader className="py-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Latest Check
                </CardTitle>
                <div className="text-2xl font-bold font-mono text-foreground mt-1">
                  200 OK
                </div>
              </CardHeader>
            </Card>
          </div>

          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base">Latency Performance (Last 24 Hours)</CardTitle>
              <CardDescription className="text-xs">
                Real-time chart visualization powered by Recharts (Phase 5).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-56 rounded-lg bg-muted/30 border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                Latency chart will render check datapoints in Phase 5.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base">Recent Check Executions</CardTitle>
              <CardDescription className="text-xs">
                Historical records of HTTP status codes, latency, and assertion evaluations.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>HTTP Code</TableHead>
                    <TableHead>Latency</TableHead>
                    <TableHead>Assertion Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-xs">2 minutes ago</TableCell>
                    <TableCell>
                      <StatusBadge status="UP" />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-emerald-500">
                      200 OK
                    </TableCell>
                    <TableCell className="font-mono text-xs">84ms</TableCell>
                    <TableCell className="text-xs text-emerald-600 dark:text-emerald-400">
                      All assertions passed
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">7 minutes ago</TableCell>
                    <TableCell>
                      <StatusBadge status="UP" />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-emerald-500">
                      200 OK
                    </TableCell>
                    <TableCell className="font-mono text-xs">88ms</TableCell>
                    <TableCell className="text-xs text-emerald-600 dark:text-emerald-400">
                      All assertions passed
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentation">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base">Endpoint Documentation</CardTitle>
              <CardDescription className="text-xs">
                Internal team documentation for this service contract.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                Receives charge and event notifications dispatched from Stripe Webhooks.
                Must return HTTP 200 within 10 seconds.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="border border-rose-500/30 bg-rose-500/5">
            <CardHeader>
              <CardTitle className="text-base text-rose-600 dark:text-rose-400">
                Danger Zone
              </CardTitle>
              <CardDescription className="text-xs">
                Permanently delete this endpoint and all associated monitoring logs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Endpoint
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function EndpointDetailPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading endpoint details...</div>}>
      <EndpointDetailContent />
    </React.Suspense>
  );
}

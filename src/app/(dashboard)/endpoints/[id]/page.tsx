"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Pause,
  Trash2,
  Edit,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Eye,
  ShieldCheck,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LatencyChart } from "@/components/endpoints/latency-chart";
import {
  getEndpointById,
  pauseEndpoint,
  resumeEndpoint,
  deleteEndpoint,
  triggerManualCheck,
  EndpointItem,
} from "@/lib/api/endpoints";
import { getEndpointHistory, CheckHistoryItem } from "@/lib/api/history";
import { toast } from "sonner";

function EndpointDetailContent() {
  const router = useRouter();
  const params = useParams();
  const endpointId = (params?.id as string) || "";

  const [endpoint, setEndpoint] = React.useState<EndpointItem | null>(null);
  const [history, setHistory] = React.useState<CheckHistoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isRunningCheck, setIsRunningCheck] = React.useState(false);
  const [selectedCheck, setSelectedCheck] = React.useState<CheckHistoryItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [refreshIndex, setRefreshIndex] = React.useState(0);

  React.useEffect(() => {
    if (!endpointId) return;
    let ignore = false;
    async function load() {
      try {
        const [ep, hist] = await Promise.all([
          getEndpointById(endpointId),
          getEndpointHistory(endpointId, 50),
        ]);
        if (!ignore) {
          setEndpoint(ep);
          setHistory(hist);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load endpoint details");
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [endpointId, refreshIndex]);

  const handleRefresh = React.useCallback(() => {
    setIsLoading(true);
    setRefreshIndex((prev) => prev + 1);
  }, []);

  const handleTriggerCheck = async () => {
    if (!endpoint) return;
    setIsRunningCheck(true);
    toast.info("Running live probe on endpoint...");

    try {
      await triggerManualCheck(endpoint.id);
      toast.success("Health check executed! Reloading check results...");
      // Wait briefly for DB check to commit, then reload history
      setTimeout(() => {
        handleRefresh();
      }, 500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Check trigger failed");
    } finally {
      setIsRunningCheck(false);
    }
  };

  const handleTogglePause = async () => {
    if (!endpoint) return;
    const isPaused = endpoint.status === "PAUSED";
    try {
      if (isPaused) {
        await resumeEndpoint(endpoint.id);
        toast.success(`Endpoint "${endpoint.name}" resumed.`);
      } else {
        await pauseEndpoint(endpoint.id);
        toast.success(`Endpoint "${endpoint.name}" paused.`);
      }
      handleRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle status");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!endpoint) return;
    try {
      await deleteEndpoint(endpoint.id);
      toast.success(`Endpoint "${endpoint.name}" deleted.`);
      router.push("/endpoints");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete endpoint");
    }
  };

  if (isLoading && !endpoint) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" render={<Link href="/endpoints" />} className="gap-1.5 text-xs text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Endpoints
          </Button>
        </div>
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="table" />
      </div>
    );
  }

  if (error || !endpoint) {
    return (
      <ErrorState
        title="Endpoint Not Found"
        description={error || "The requested endpoint does not exist or has been deleted."}
        onRetry={handleRefresh}
      />
    );
  }

  // Calculate 30d uptime from check history
  const totalChecks = history.length;
  const successfulChecks = history.filter((h) => h.isSuccess || h.status === "SUCCESS").length;
  const uptimeRatio = totalChecks > 0 ? ((successfulChecks / totalChecks) * 100).toFixed(1) : "100";

  const chartData = history.slice(0, 24).reverse().map((h) => ({
    time: new Date(h.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    latency: h.responseTimeMs || 0,
  }));

  const fallbackChartData = [
    { time: "00:00", latency: 0 },
    { time: "06:00", latency: 0 },
    { time: "12:00", latency: 0 },
    { time: "18:00", latency: 0 },
  ];

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
              {endpoint.name}
            </h1>
            <StatusBadge status={endpoint.status} />
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {endpoint.method} {endpoint.url} • Interval: {endpoint.intervalSeconds}s • Timeout: {endpoint.timeoutMs}ms
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={handleTriggerCheck}
            disabled={isRunningCheck}
            className="gap-1.5 text-xs"
          >
            {isRunningCheck ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 text-emerald-500" />
            )}
            Run Check Now
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleTogglePause}
            className="gap-1.5 text-xs"
          >
            {endpoint.status === "PAUSED" ? (
              <>
                <Play className="h-3.5 w-3.5 text-emerald-500" />
                Resume Monitoring
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5 text-amber-500" />
                Pause Checks
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/endpoints/${endpoint.id}/edit`} />}
            className="gap-1.5 text-xs"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History Logs ({history.length})</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
          <TabsTrigger value="settings">Danger Zone</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border border-border">
              <CardHeader className="py-3">
                <CardDescription className="text-xs">Uptime Availability</CardDescription>
                <CardTitle className="text-2xl font-bold font-mono text-emerald-500">
                  {uptimeRatio}%
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border border-border">
              <CardHeader className="py-3">
                <CardDescription className="text-xs">Latest Response Time</CardDescription>
                <CardTitle className="text-2xl font-bold font-mono">
                  {history[0]?.responseTimeMs ? `${Math.round(history[0].responseTimeMs)} ms` : "—"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border border-border">
              <CardHeader className="py-3">
                <CardDescription className="text-xs">SSRF Protection</CardDescription>
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                  <ShieldCheck className="h-4 w-4" /> Multi-layer IP Pinning
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="border border-border">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Recent Probe Latency
                </CardTitle>
                <CardDescription className="text-xs">
                  Historical response times recorded by the background monitoring worker.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRefresh} className="gap-1 text-xs">
                <RefreshCw className="h-3 w-3" /> Refresh
              </Button>
            </CardHeader>
            <CardContent className="pt-2 pb-6 px-4">
              <LatencyChart data={chartData.length > 0 ? chartData : fallbackChartData} height={240} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: History */}
        <TabsContent value="history">
          <Card className="border border-border">
            <CardHeader className="py-4">
              <CardTitle className="text-base">Check History</CardTitle>
              <CardDescription className="text-xs">
                Detailed audit trail of recent HTTP probes and assertion evaluations.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No check records logged yet. Click &quot;Run Check Now&quot; to perform an immediate probe.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>HTTP Code</TableHead>
                      <TableHead>Latency</TableHead>
                      <TableHead>Assertion Result</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {new Date(item.checkedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              item.isSuccess
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-mono text-[11px]"
                                : "bg-rose-500/10 text-rose-500 border-rose-500/30 font-mono text-[11px]"
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">
                          {item.statusCode || "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.responseTimeMs !== null ? `${Math.round(item.responseTimeMs)} ms` : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.isSuccess ? (
                            <span className="text-emerald-500 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> All passed
                            </span>
                          ) : (
                            <span className="text-rose-500 flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5" /> {item.errorMessage || "Check failed"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCheck(item)}
                            className="gap-1 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Inspect
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Documentation */}
        <TabsContent value="documentation">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base">Service Contract Documentation</CardTitle>
              <CardDescription className="text-xs">
                Internal team documentation and payload contracts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Target URL</span>
                <p className="font-mono text-xs p-2 bg-muted/40 rounded border border-border">
                  {endpoint.method} {endpoint.url}
                </p>
              </div>

              <div className="space-y-1 pt-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Security & Guard Constraints</span>
                <div className="rounded-lg bg-muted/40 p-3 font-mono text-xs space-y-1 text-muted-foreground border border-border">
                  <p>• Outbound IP Pinning enforced by Worker.</p>
                  <p>• Max response threshold: 1 MB (body snippets truncated to 4 KB).</p>
                  <p>• Redirect safety: {endpoint.config?.followRedirects ? "Follows redirects with SSRF check" : "Redirects disabled"}.</p>
                  <p>• Expected Status Codes: {endpoint.config?.expectedStatusCodes?.join(", ") || "200"}.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Danger Zone */}
        <TabsContent value="settings">
          <Card className="border border-rose-500/30 bg-rose-500/5">
            <CardHeader>
              <CardTitle className="text-base text-rose-600 dark:text-rose-400">
                Danger Zone
              </CardTitle>
              <CardDescription className="text-xs">
                Permanently stop checks and delete all historic logs for this endpoint.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete Endpoint Permanently
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Raw Check Inspector Modal */}
      <Dialog open={!!selectedCheck} onOpenChange={(open) => !open && setSelectedCheck(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Check Execution Inspector
            </DialogTitle>
            <DialogDescription className="text-xs">
              Raw HTTP response and diagnostic metadata recorded for check ID {selectedCheck?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedCheck && (
            <div className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2 bg-muted/30 p-3 rounded-lg border border-border">
                <div>
                  <span className="text-muted-foreground">HTTP Status:</span>{" "}
                  <span className="font-semibold">{selectedCheck.statusCode || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Response Time:</span>{" "}
                  <span className="font-semibold">{selectedCheck.responseTimeMs} ms</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Timestamp:</span>{" "}
                  <span>{new Date(selectedCheck.checkedAt).toISOString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Outcome:</span>{" "}
                  <span className={selectedCheck.isSuccess ? "text-emerald-500" : "text-rose-500"}>
                    {selectedCheck.status}
                  </span>
                </div>
              </div>

              {selectedCheck.errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-500">
                  <span className="font-semibold">Error Message:</span> {selectedCheck.errorMessage}
                </div>
              )}

              <div className="space-y-1">
                <span className="text-muted-foreground uppercase text-[10px] font-semibold">
                  Response Body Snippet (Max 4 KB)
                </span>
                <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-100 overflow-x-auto max-h-56 text-[11px] whitespace-pre-wrap">
                  {selectedCheck.assertionResults?.bodySnippet || "No response body recorded"}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={`Delete "${endpoint.name}"?`}
        description="Are you sure you want to delete this monitored endpoint? All historical check logs, incident reports, and background scheduler jobs will be permanently purged. This action cannot be reversed."
        confirmText="Delete Endpoint"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

export default function EndpointDetailPage() {
  return (
    <React.Suspense fallback={<LoadingSkeleton variant="card" />}>
      <EndpointDetailContent />
    </React.Suspense>
  );
}

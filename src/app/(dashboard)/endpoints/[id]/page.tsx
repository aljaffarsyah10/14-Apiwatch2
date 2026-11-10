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
  Copy,
  Save,
  BookOpen,
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
import { Textarea } from "@/components/ui/textarea";
import { LatencyChart } from "@/components/endpoints/latency-chart";
import {
  getEndpointById,
  pauseEndpoint,
  resumeEndpoint,
  deleteEndpoint,
  triggerManualCheck,
  updateEndpointDocs,
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
  const [historyFilter, setHistoryFilter] = React.useState<string>("ALL");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isRunningCheck, setIsRunningCheck] = React.useState(false);
  const [selectedCheck, setSelectedCheck] = React.useState<CheckHistoryItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [refreshIndex, setRefreshIndex] = React.useState(0);

  // Documentation state
  const [docDescription, setDocDescription] = React.useState("");
  const [docRequestExample, setDocRequestExample] = React.useState("");
  const [docResponseExample, setDocResponseExample] = React.useState("");
  const [isSavingDocs, setIsSavingDocs] = React.useState(false);

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
          if (ep.documentation) {
            setDocDescription(ep.documentation.description || "");
            setDocRequestExample(ep.documentation.requestExample || "");
            setDocResponseExample(ep.documentation.responseExample || "");
          }
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

  const handleSaveDocs = async () => {
    if (!endpoint) return;
    try {
      setIsSavingDocs(true);
      await updateEndpointDocs(endpoint.id, {
        description: docDescription,
        requestExample: docRequestExample,
        responseExample: docResponseExample,
      });
      toast.success("Service documentation updated successfully.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save documentation");
    } finally {
      setIsSavingDocs(false);
    }
  };

  const handleCopyCurl = () => {
    if (!endpoint) return;
    const curl = `curl -X ${endpoint.method} "${endpoint.url}" -H "Accept: application/json"`;
    navigator.clipboard.writeText(curl);
    toast.success("cURL command copied to clipboard!");
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
        <LoadingSkeleton type="card" />
        <LoadingSkeleton type="table" />
      </div>
    );
  }

  if (error || !endpoint) {
    return (
      <ErrorState
        title="Endpoint Not Found"
        message={error || "The requested endpoint does not exist or has been deleted."}
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

  const filteredHistory = history.filter((item) => {
    if (historyFilter === "ALL") return true;
    return item.status === historyFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/endpoints" />} className="gap-1.5 text-xs text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Endpoints
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {endpoint.name}
            </h1>
            <StatusBadge status={endpoint.status} />
          </div>
          <p className="font-mono text-sm text-muted-foreground">
            {endpoint.method} {endpoint.url} • Interval: {endpoint.intervalSeconds}s • Timeout: {endpoint.timeoutMs}ms
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleTriggerCheck}
            disabled={isRunningCheck}
            className="gap-2"
          >
            {isRunningCheck ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 text-success" />
            )}
            Run Check Now
          </Button>

          <Button
            variant="outline"
            onClick={handleTogglePause}
            className="gap-2"
          >
            {endpoint.status === "PAUSED" ? (
              <>
                <Play className="h-4 w-4 text-success" />
                Resume Monitoring
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 text-warning" />
                Pause Checks
              </>
            )}
          </Button>

          <Button
            variant="outline"
            render={<Link href={`/endpoints/${endpoint.id}/edit`} />}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
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
            <Card>
              <CardHeader className="py-3">
                <CardDescription>Uptime Availability</CardDescription>
                <CardTitle className="text-2xl font-bold font-mono text-success">
                  {uptimeRatio}%
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="py-3">
                <CardDescription>Latest Response Time</CardDescription>
                <CardTitle className="text-2xl font-bold font-mono">
                  {history[0]?.responseTimeMs ? `${Math.round(history[0].responseTimeMs)} ms` : "—"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="py-3">
                <CardDescription>SSRF Protection</CardDescription>
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                  <ShieldCheck className="h-4 w-4" /> Multi-layer IP Pinning
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Recent Probe Latency
                </CardTitle>
                <CardDescription>
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

        {/* Tab 2: History with Filtering */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Check History</CardTitle>
                <CardDescription>
                  Detailed audit trail of recent HTTP probes and assertion evaluations.
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5 text-xs bg-muted/40 p-1 rounded-lg border border-border">
                {["ALL", "SUCCESS", "FAILED", "TIMEOUT", "ERROR"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setHistoryFilter(st)}
                    className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                      historyFilter === st
                        ? "bg-background text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredHistory.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No check records matching the &quot;{historyFilter}&quot; filter.
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
                    {filteredHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="tabular-nums text-sm text-muted-foreground">
                          {new Date(item.checkedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              item.isSuccess
                                ? "bg-success/10 text-success border-success/30 font-semibold text-xs"
                                : "bg-destructive/10 text-destructive border-destructive/30 font-semibold text-xs"
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm font-semibold">
                          {item.statusCode || "—"}
                        </TableCell>
                        <TableCell className="tabular-nums text-sm font-medium">
                          {item.responseTimeMs !== null ? `${Math.round(item.responseTimeMs)} ms` : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.isSuccess ? (
                            <span className="text-success flex items-center gap-1 font-medium">
                              <CheckCircle2 className="h-4 w-4" /> All passed
                            </span>
                          ) : (
                            <span className="text-destructive flex items-center gap-1 font-medium">
                              <AlertTriangle className="h-4 w-4" /> {item.errorMessage || "Check failed"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCheck(item)}
                            className="gap-1.5"
                          >
                            <Eye className="h-4 w-4" />
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

        {/* Tab 3: Documentation & Contract Notes */}
        <TabsContent value="documentation" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Service Contract & Documentation
                </CardTitle>
                <CardDescription>
                  Maintain team notes, payload schema, and testing instructions for this service.
                </CardDescription>
              </div>
              <Button
                onClick={handleSaveDocs}
                disabled={isSavingDocs}
                className="gap-2"
              >
                {isSavingDocs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Notes
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick cURL Command
                </span>
                <div className="flex items-center gap-2 bg-muted/40 p-3 rounded-lg border border-border">
                  <code className="text-sm font-mono text-foreground flex-1 truncate">
                    curl -X {endpoint.method} &quot;{endpoint.url}&quot; -H &quot;Accept: application/json&quot;
                  </code>
                  <Button variant="ghost" size="icon" onClick={handleCopyCurl} title="Copy cURL">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Service Description
                </span>
                <Textarea
                  placeholder="Describe what this endpoint does, dependent services, on-call instructions..."
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Request Example (JSON / Params)
                  </span>
                  <Textarea
                    placeholder='{"key": "value"}'
                    value={docRequestExample}
                    onChange={(e) => setDocRequestExample(e.target.value)}
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Expected Response Example (JSON)
                  </span>
                  <Textarea
                    placeholder='{"status": "ok", "code": 200}'
                    value={docResponseExample}
                    onChange={(e) => setDocResponseExample(e.target.value)}
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Danger Zone */}
        <TabsContent value="settings">
          <Card className="border border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-base text-destructive">
                Danger Zone
              </CardTitle>
              <CardDescription>
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

      {/* Safe Raw Check Inspector Modal */}
      <Dialog open={!!selectedCheck} onOpenChange={(open) => !open && setSelectedCheck(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Check Execution Inspector
            </DialogTitle>
            <DialogDescription className="text-sm">
              Raw HTTP response and diagnostic metadata recorded for check ID {selectedCheck?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedCheck && (
            <div className="space-y-4 text-sm font-mono">
              <div className="grid grid-cols-2 gap-3 bg-muted/30 p-4 rounded-xl border border-border">
                <div>
                  <span className="text-muted-foreground">HTTP Status:</span>{" "}
                  <span className="font-semibold text-foreground">{selectedCheck.statusCode || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Response Time:</span>{" "}
                  <span className="font-semibold text-foreground">{selectedCheck.responseTimeMs} ms</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Timestamp:</span>{" "}
                  <span className="text-foreground">{new Date(selectedCheck.checkedAt).toISOString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Outcome:</span>{" "}
                  <span className={selectedCheck.isSuccess ? "text-success font-semibold" : "text-destructive font-semibold"}>
                    {selectedCheck.status}
                  </span>
                </div>
              </div>

              {selectedCheck.errorMessage && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm font-sans">
                  <span className="font-semibold">Failure Cause:</span> {selectedCheck.errorMessage}
                </div>
              )}

              <div className="space-y-2 font-sans">
                <span className="text-muted-foreground uppercase text-xs font-semibold tracking-wider block">
                  Safe Response Body Preview (Sanitized, Escaped)
                </span>
                <pre className="p-3.5 rounded-lg bg-zinc-950 text-zinc-100 overflow-x-auto max-h-56 text-xs whitespace-pre-wrap select-all font-mono">
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
    <React.Suspense fallback={<LoadingSkeleton type="card" />}>
      <EndpointDetailContent />
    </React.Suspense>
  );
}

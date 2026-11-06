"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, Pause, Trash2, Edit, Activity, CheckCircle2, AlertTriangle, Eye, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LatencyChart } from "@/components/endpoints/latency-chart";
import { initialMockEndpoints, MockEndpoint } from "@/features/endpoints/mock/endpoints.data";
import { mock24hLatencyData } from "@/features/dashboard/mock/dashboard.data";
import { mockCheckHistory, CheckHistoryItem } from "@/features/history/mock/history.data";
import { toast } from "sonner";

function EndpointDetailContent() {
  const router = useRouter();
  const params = useParams();
  const endpointId = (params?.id as string) || "ep-1";

  const [endpoint, setEndpoint] = React.useState<MockEndpoint>(() => {
    return (
      initialMockEndpoints.find((e) => e.id === endpointId) ||
      initialMockEndpoints[0]
    );
  });

  const [isRunningCheck, setIsRunningCheck] = React.useState(false);
  const [selectedCheck, setSelectedCheck] = React.useState<CheckHistoryItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const endpointHistory = mockCheckHistory.filter(
    (h) => h.endpointId === endpoint.id || endpoint.id === "ep-1"
  );

  const handleTriggerCheck = () => {
    setIsRunningCheck(true);
    toast.info("Triggering on-demand check via worker queue...");
    setTimeout(() => {
      setIsRunningCheck(false);
      toast.success("Health check succeeded: 200 OK (86ms).");
    }, 1000);
  };

  const handleTogglePause = () => {
    const nextStatus = endpoint.status === "PAUSED" ? "UP" : "PAUSED";
    setEndpoint((prev) => ({
      ...prev,
      status: nextStatus,
      isActive: nextStatus !== "PAUSED",
    }));
    toast.success(`Endpoint is now ${nextStatus === "PAUSED" ? "paused" : "resumed"}.`);
  };

  const handleDeleteConfirm = () => {
    toast.success(`Endpoint "${endpoint.name}" deleted.`);
    router.push("/endpoints");
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
              <Play className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Pause className="h-3.5 w-3.5 text-amber-500" />
            )}
            {endpoint.status === "PAUSED" ? "Resume" : "Pause"}
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

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Check History ({endpointHistory.length})</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
          <TabsTrigger value="settings">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-border">
              <CardHeader className="py-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  30-Day SLA Uptime
                </CardTitle>
                <div className="text-2xl font-bold font-mono text-emerald-500 mt-1">
                  {endpoint.uptime30d}
                </div>
              </CardHeader>
            </Card>

            <Card className="border border-border">
              <CardHeader className="py-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Latest Response Time
                </CardTitle>
                <div className="text-2xl font-bold font-mono text-foreground mt-1">
                  {endpoint.latency}
                </div>
              </CardHeader>
            </Card>

            <Card className="border border-border">
              <CardHeader className="py-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Expected Status Codes
                </CardTitle>
                <div className="text-2xl font-bold font-mono text-foreground mt-1">
                  {endpoint.expectedStatusCodes.join(", ")}
                </div>
              </CardHeader>
            </Card>
          </div>

          <Card className="border border-border">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Response Time Trend (Last 24 Hours)
                </CardTitle>
                <CardDescription className="text-xs">
                  Historical latency telemetry measured during scheduled worker checks.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                Max SLA: {endpoint.timeoutMs}ms
              </Badge>
            </CardHeader>
            <CardContent className="pt-2 pb-6 px-4">
              <LatencyChart data={mock24hLatencyData} height={240} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base">Recent Check Executions</CardTitle>
              <CardDescription className="text-xs">
                Inspect raw status codes, latency timings, and assertion results.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
                  {endpointHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.timestamp}
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
                      <TableCell className="font-mono text-xs">{item.responseTimeMs} ms</TableCell>
                      <TableCell className="text-xs">
                        {item.isSuccess ? (
                          <span className="text-emerald-500 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> All passed
                          </span>
                        ) : (
                          <span className="text-rose-500 flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" /> {item.errorMessage}
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
            </CardContent>
          </Card>
        </TabsContent>

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
                <span className="text-xs font-semibold text-muted-foreground uppercase">Description</span>
                <p className="text-foreground">{endpoint.description || "No documentation provided."}</p>
              </div>

              <div className="space-y-1 pt-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Security Constraints</span>
                <div className="rounded-lg bg-muted/40 p-3 font-mono text-xs space-y-1 text-muted-foreground">
                  <p>• Outbound IP Pinning enforced by Worker.</p>
                  <p>• Max response threshold: 1 MB.</p>
                  <p>• Multi-hop redirects: Disabled.</p>
                </div>
              </div>
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
                Permanently stop checks and delete all historic logs for this endpoint.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Endpoint Permanently
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Raw Check Inspection Modal */}
      {selectedCheck && (
        <Dialog open={Boolean(selectedCheck)} onOpenChange={() => setSelectedCheck(null)}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Check Result Inspector: {selectedCheck.id}
              </DialogTitle>
              <DialogDescription className="text-xs font-mono">
                Executed at {selectedCheck.isoTime}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/40 border border-border/60">
                <div>
                  <span className="text-muted-foreground">HTTP Status:</span>{" "}
                  <span className="font-semibold text-foreground">{selectedCheck.statusCode}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Latency:</span>{" "}
                  <span className="font-semibold text-primary">{selectedCheck.responseTimeMs} ms</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Resolved IP:</span>{" "}
                  <span className="text-foreground">{selectedCheck.requestDetails.resolvedIp}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Response Size:</span>{" "}
                  <span className="text-foreground">{selectedCheck.requestDetails.responseSize}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-sans font-semibold text-foreground">Assertion Evaluation</span>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/60 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span>Status Code in [{endpoint.expectedStatusCodes.join(",")}]:</span>
                    <Badge variant={selectedCheck.assertions.statusMatch ? "outline" : "destructive"} className="text-[10px]">
                      {selectedCheck.assertions.statusMatch ? "PASS" : "FAIL"}
                    </Badge>
                  </div>
                  {selectedCheck.assertions.bodyMatch !== undefined && (
                    <div className="flex justify-between items-center">
                      <span>Body contains pattern:</span>
                      <Badge variant={selectedCheck.assertions.bodyMatch ? "outline" : "destructive"} className="text-[10px]">
                        {selectedCheck.assertions.bodyMatch ? "PASS" : "FAIL"}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Endpoint"
        description={`Are you sure you want to permanently delete "${endpoint.name}"? This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
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

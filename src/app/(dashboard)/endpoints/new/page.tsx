"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Play, Plus, Trash2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { endpointFormSchema, EndpointFormValues, httpMethods } from "@/lib/validations/endpoint.schema";
import { createEndpoint } from "@/lib/api/endpoints";
import { toast } from "sonner";

export default function NewEndpointPage() {
  const router = useRouter();
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{
    success: boolean;
    status?: number;
    latencyMs?: number;
    message?: string;
  } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<EndpointFormValues>({
    resolver: zodResolver(endpointFormSchema),
    defaultValues: {
      name: "",
      url: "https://",
      method: "GET",
      intervalSeconds: 300,
      timeoutMs: 10000,
      expectedStatusCodes: "200",
      requestHeaders: [],
      requestBody: "",
      expectedBodyContains: "",
      expectedBodyNotContains: "",
      followRedirects: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "requestHeaders",
  });

  const currentMethod = useWatch({ control, name: "method" });

  const handleTestNow = async () => {
    const values = getValues();
    if (!values.url || !values.url.startsWith("http")) {
      toast.error("Please enter a valid HTTP/HTTPS URL first.");
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/endpoints/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setTestResult({
          success: false,
          status: data.statusCode,
          latencyMs: data.responseTimeMs,
          message: data.error || data.message || "Endpoint probe failed",
        });
        toast.error(data.error || "Test check failed");
      } else {
        setTestResult({
          success: true,
          status: data.statusCode,
          latencyMs: data.responseTimeMs,
          message: data.message,
        });
        toast.success(`Check succeeded (${data.responseTimeMs}ms)`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error during test";
      setTestResult({
        success: false,
        message: msg,
      });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const onSubmit = async (data: EndpointFormValues) => {
    try {
      const created = await createEndpoint(data);
      toast.success(`Endpoint "${created.name}" created and scheduled for monitoring!`);
      router.push("/endpoints");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create endpoint");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/endpoints" />} className="gap-1.5 text-xs text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Endpoints
        </Button>
      </div>

      <PageHeader
        title="Create Endpoint"
        description="Configure automated monitoring, intervals, and health assertions."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Basic Information */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">1. Basic Information</CardTitle>
            <CardDescription className="text-xs">
              Give your monitored endpoint a recognizable name and public URL target.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Endpoint Name</Label>
              <Input
                id="name"
                placeholder="e.g., Auth Service API, Payment Gateway"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-rose-500 font-medium">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="method">HTTP Method</Label>
                <select
                  id="method"
                  {...register("method")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {httpMethods.map((m) => (
                    <option key={m} value={m} className="bg-popover text-popover-foreground">
                      {m}
                    </option>
                  ))}
                </select>
                {errors.method && (
                  <p className="text-xs text-rose-500 font-medium">{errors.method.message}</p>
                )}
              </div>

              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="url">Target URL</Label>
                <Input
                  id="url"
                  placeholder="https://api.yourdomain.com/v1/health"
                  {...register("url")}
                />
                {errors.url && (
                  <p className="text-xs text-rose-500 font-medium">{errors.url.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Monitoring Schedule & Timeouts */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">2. Schedule & Limits</CardTitle>
            <CardDescription className="text-xs">
              Configure how often APIWatch probes your service and maximum acceptable latency.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="intervalSeconds">Check Interval (Seconds)</Label>
              <Input
                id="intervalSeconds"
                type="number"
                min={60}
                max={86400}
                {...register("intervalSeconds", { valueAsNumber: true })}
              />
              <p className="text-[11px] text-muted-foreground">Default: 300s (5 minutes). Minimum: 60s.</p>
              {errors.intervalSeconds && (
                <p className="text-xs text-rose-500 font-medium">{errors.intervalSeconds.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeoutMs">Request Timeout (Milliseconds)</Label>
              <Input
                id="timeoutMs"
                type="number"
                min={1000}
                max={30000}
                step={500}
                {...register("timeoutMs", { valueAsNumber: true })}
              />
              <p className="text-[11px] text-muted-foreground">Maximum allowable latency before timing out (1s - 30s).</p>
              {errors.timeoutMs && (
                <p className="text-xs text-rose-500 font-medium">{errors.timeoutMs.message}</p>
              )}
            </div>

            <div className="sm:col-span-2 pt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="followRedirects"
                {...register("followRedirects")}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="followRedirects" className="text-xs cursor-pointer">
                Follow HTTP Redirects (up to 3 hops with safe SSRF re-verification)
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Headers & Payload */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">3. Headers & Request Payload</CardTitle>
            <CardDescription className="text-xs">
              Supply custom headers (e.g., Bearer tokens, API keys) and request payload for POST/PUT.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Custom Request Headers</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ key: "", value: "" })}
                  className="gap-1.5 text-xs h-7"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Header
                </Button>
              </div>

              {fields.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No custom headers configured.</p>
              ) : (
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Input
                        placeholder="Header Name (e.g. Authorization)"
                        {...register(`requestHeaders.${index}.key` as const)}
                        className="text-xs"
                      />
                      <Input
                        placeholder="Header Value (e.g. Bearer token_xyz)"
                        {...register(`requestHeaders.${index}.value` as const)}
                        className="text-xs"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(index)}
                        className="text-rose-500 hover:text-rose-600 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {["POST", "PUT", "PATCH"].includes(currentMethod) && (
              <div className="space-y-2 pt-2 border-t border-border">
                <Label htmlFor="requestBody">Request Body (JSON / Raw)</Label>
                <textarea
                  id="requestBody"
                  rows={4}
                  placeholder='{"ping": "pong"}'
                  {...register("requestBody")}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Health Assertions */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">4. Assertions & Validation</CardTitle>
            <CardDescription className="text-xs">
              Define the criteria required for the probe to consider this endpoint healthy (UP).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expectedStatusCodes">Expected HTTP Status Codes</Label>
              <Input
                id="expectedStatusCodes"
                placeholder="200, 201, 204"
                {...register("expectedStatusCodes")}
              />
              <p className="text-[11px] text-muted-foreground">Comma-separated status codes considered healthy.</p>
              {errors.expectedStatusCodes && (
                <p className="text-xs text-rose-500 font-medium">{errors.expectedStatusCodes.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedBodyContains">Response Body Must Contain (Optional)</Label>
              <Input
                id="expectedBodyContains"
                placeholder='e.g. "status":"ok"'
                {...register("expectedBodyContains")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedBodyNotContains">Response Body Must NOT Contain (Optional)</Label>
              <Input
                id="expectedBodyNotContains"
                placeholder='e.g. "error", "database connection failed"'
                {...register("expectedBodyNotContains")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Test Result Display */}
        {testResult && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              testResult.success
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
            }`}
          >
            {testResult.success ? (
              <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 text-xs">
              <p className="font-semibold">
                {testResult.success ? "Test Health Check Passed" : "Test Health Check Failed"}
              </p>
              <p className="text-muted-foreground">{testResult.message}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestNow}
            disabled={testing}
            className="gap-2"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 text-emerald-500" />
            )}
            {testing ? "Probing Target..." : "Test Endpoint Now"}
          </Button>

          <div className="flex items-center gap-3">
            <Button variant="ghost" render={<Link href="/endpoints" />}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save & Start Monitoring
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

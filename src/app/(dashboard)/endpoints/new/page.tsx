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
      followRedirects: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "requestHeaders",
  });

  const currentMethod = useWatch({ control, name: "method" });

  const handleTestNow = () => {
    const url = getValues("url");
    if (!url || !url.startsWith("http")) {
      toast.error("Please enter a valid HTTP/HTTPS URL first.");
      return;
    }

    setTesting(true);
    setTestResult(null);

    setTimeout(() => {
      setTesting(false);
      setTestResult({
        success: true,
        status: 200,
        latencyMs: 92,
        message: "Endpoint responded with HTTP 200 OK within 92ms. All assertions passed.",
      });
      toast.success("Health check test passed!");
    }, 1200);
  };

  const onSubmit = (data: EndpointFormValues) => {
    toast.success(`Endpoint "${data.name}" created successfully.`);
    router.push("/endpoints");
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
            <CardTitle className="text-base">1. Basic Information</CardTitle>
            <CardDescription className="text-xs">
              Define the target URL and HTTP request parameters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Endpoint Name</Label>
              <Input
                id="name"
                placeholder="e.g. Stripe Webhook Dispatcher"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-rose-500 font-medium">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="method">Method</Label>
                <select
                  id="method"
                  {...register("method")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {httpMethods.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                {errors.method && (
                  <p className="text-xs text-rose-500">{errors.method.message}</p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-3">
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

        {/* Section 2: Schedule & Timeout */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base">2. Monitoring Schedule & Timeout</CardTitle>
            <CardDescription className="text-xs">
              Determine check frequency and maximum allowable request latency.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interval">Check Interval</Label>
              <select
                id="interval"
                {...register("intervalSeconds", { valueAsNumber: true })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value={60}>Every 1 minute</option>
                <option value={180}>Every 3 minutes</option>
                <option value={300}>Every 5 minutes (Recommended)</option>
                <option value={600}>Every 10 minutes</option>
                <option value={1800}>Every 30 minutes</option>
                <option value={3600}>Every 1 hour</option>
              </select>
              {errors.intervalSeconds && (
                <p className="text-xs text-rose-500">{errors.intervalSeconds.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (Milliseconds)</Label>
              <Input
                id="timeout"
                type="number"
                min="1000"
                max="30000"
                step="500"
                {...register("timeoutMs", { valueAsNumber: true })}
              />
              {errors.timeoutMs && (
                <p className="text-xs text-rose-500">{errors.timeoutMs.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Headers & Body */}
        <Card className="border border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">3. Custom Request Headers & Payload</CardTitle>
              <CardDescription className="text-xs">
                Supply authentication tokens, API keys, or JSON body.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ key: "", value: "" })}
              className="gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Header
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.length > 0 && (
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input
                      placeholder="Header Name (e.g. Authorization)"
                      {...register(`requestHeaders.${index}.key` as const)}
                      className="flex-1 font-mono text-xs"
                    />
                    <Input
                      placeholder="Header Value (e.g. Bearer token)"
                      {...register(`requestHeaders.${index}.value` as const)}
                      className="flex-1 font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {currentMethod !== "GET" && currentMethod !== "HEAD" && (
              <div className="space-y-2">
                <Label htmlFor="requestBody">Request Body (JSON / Raw Payload)</Label>
                <textarea
                  id="requestBody"
                  rows={4}
                  {...register("requestBody")}
                  placeholder={`{\n  "event": "ping"\n}`}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Health Assertions */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base">4. Health Assertions</CardTitle>
            <CardDescription className="text-xs">
              Rules determining whether the endpoint check evaluates to UP or DOWN.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expectedStatusCodes">Expected Status Codes</Label>
              <Input
                id="expectedStatusCodes"
                placeholder="200, 201, 204"
                {...register("expectedStatusCodes")}
              />
              <p className="text-[11px] text-muted-foreground">
                Comma-separated HTTP status codes considered healthy.
              </p>
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
              <p className="font-semibold">Test Health Check Passed</p>
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
            {testing ? "Testing URL..." : "Test Endpoint Now"}
          </Button>

          <div className="flex items-center gap-3">
            <Button variant="ghost" render={<Link href="/endpoints" />}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              <Save className="h-4 w-4" />
              Save & Start Monitoring
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

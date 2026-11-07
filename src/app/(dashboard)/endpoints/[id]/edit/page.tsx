"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { endpointFormSchema, EndpointFormValues, httpMethods } from "@/lib/validations/endpoint.schema";
import { getEndpointById, updateEndpoint, EndpointItem } from "@/lib/api/endpoints";
import { toast } from "sonner";

function EditEndpointContent() {
  const router = useRouter();
  const params = useParams();
  const endpointId = (params?.id as string) || "";

  const [endpoint, setEndpoint] = React.useState<EndpointItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EndpointFormValues>({
    resolver: zodResolver(endpointFormSchema),
  });

  React.useEffect(() => {
    async function loadEndpoint() {
      if (!endpointId) return;
      try {
        setIsLoading(true);
        setError(null);
        const data = await getEndpointById(endpointId);
        setEndpoint(data);

        // Prepopulate form values
        reset({
          name: data.name,
          url: data.url,
          method: data.method as EndpointFormValues["method"],
          intervalSeconds: data.intervalSeconds,
          timeoutMs: data.timeoutMs,
          expectedStatusCodes: data.config?.expectedStatusCodes?.join(", ") || "200",
          requestHeaders: [],
          requestBody: data.config?.requestBody || "",
          expectedBodyContains: data.config?.expectedBodyContains || "",
          expectedBodyNotContains: data.config?.expectedBodyNotContains || "",
          followRedirects: data.config?.followRedirects ?? false,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load endpoint");
      } finally {
        setIsLoading(false);
      }
    }
    loadEndpoint();
  }, [endpointId, reset]);

  const onSubmit = async (data: EndpointFormValues) => {
    try {
      await updateEndpoint(endpointId, data);
      toast.success(`Endpoint "${data.name}" updated successfully.`);
      router.push(`/endpoints/${endpointId}`);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update endpoint");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" render={<Link href={`/endpoints/${endpointId}`} />} className="gap-1.5 text-xs text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Detail
          </Button>
        </div>
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  if (error || !endpoint) {
    return (
      <ErrorState
        title="Could not find endpoint"
        description={error || "Endpoint does not exist"}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href={`/endpoints/${endpointId}`} />} className="gap-1.5 text-xs text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Detail
        </Button>
      </div>

      <PageHeader
        title={`Edit: ${endpoint.name}`}
        description="Modify target parameters, interval schedules, and assertions."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Target Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Endpoint Name</Label>
              <Input id="name" {...register("name")} />
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
                    <option key={m} value={m} className="bg-popover text-popover-foreground">
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="url">Target URL</Label>
                <Input id="url" {...register("url")} />
                {errors.url && (
                  <p className="text-xs text-rose-500 font-medium">{errors.url.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="intervalSeconds">Interval (Seconds)</Label>
                <Input
                  id="intervalSeconds"
                  type="number"
                  min={60}
                  max={86400}
                  {...register("intervalSeconds", { valueAsNumber: true })}
                />
                {errors.intervalSeconds && (
                  <p className="text-xs text-rose-500 font-medium">{errors.intervalSeconds.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeoutMs">Timeout (Milliseconds)</Label>
                <Input
                  id="timeoutMs"
                  type="number"
                  min={1000}
                  max={30000}
                  step={500}
                  {...register("timeoutMs", { valueAsNumber: true })}
                />
                {errors.timeoutMs && (
                  <p className="text-xs text-rose-500 font-medium">{errors.timeoutMs.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="expectedStatusCodes">Expected Status Codes</Label>
              <Input id="expectedStatusCodes" {...register("expectedStatusCodes")} />
              {errors.expectedStatusCodes && (
                <p className="text-xs text-rose-500 font-medium">{errors.expectedStatusCodes.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedBodyContains">Body Must Contain (Optional)</Label>
              <Input id="expectedBodyContains" {...register("expectedBodyContains")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedBodyNotContains">Body Must NOT Contain (Optional)</Label>
              <Input id="expectedBodyNotContains" {...register("expectedBodyNotContains")} />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="followRedirects"
                {...register("followRedirects")}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="followRedirects" className="text-xs cursor-pointer">
                Follow HTTP Redirects (up to 3 hops)
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" render={<Link href={`/endpoints/${endpointId}`} />}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function EditEndpointPage() {
  return (
    <React.Suspense fallback={<LoadingSkeleton variant="card" />}>
      <EditEndpointContent />
    </React.Suspense>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { endpointFormSchema, EndpointFormValues, httpMethods } from "@/lib/validations/endpoint.schema";
import { initialMockEndpoints } from "@/features/endpoints/mock/endpoints.data";
import { toast } from "sonner";

function EditEndpointContent() {
  const router = useRouter();
  const params = useParams();
  const endpointId = (params?.id as string) || "ep-1";

  const endpoint =
    initialMockEndpoints.find((e) => e.id === endpointId) || initialMockEndpoints[0];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EndpointFormValues>({
    resolver: zodResolver(endpointFormSchema),
    defaultValues: {
      name: endpoint.name,
      url: endpoint.url,
      method: endpoint.method,
      intervalSeconds: endpoint.intervalSeconds,
      timeoutMs: endpoint.timeoutMs,
      expectedStatusCodes: endpoint.expectedStatusCodes.join(", "),
      requestHeaders: endpoint.requestHeaders || [],
      requestBody: endpoint.requestBody || "",
      expectedBodyContains: endpoint.expectedBodyContains || "",
      followRedirects: false,
    },
  });

  const onSubmit = (data: EndpointFormValues) => {
    toast.success(`Endpoint "${data.name}" updated successfully.`);
    router.push(`/endpoints/${endpointId}`);
  };

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
            <CardTitle className="text-base">Target Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Endpoint Name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-rose-500">{errors.name.message}</p>
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
              </div>

              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="url">Target URL</Label>
                <Input id="url" {...register("url")} />
                {errors.url && (
                  <p className="text-xs text-rose-500">{errors.url.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interval">Interval (Seconds)</Label>
                <Input
                  id="interval"
                  type="number"
                  {...register("intervalSeconds", { valueAsNumber: true })}
                />
                {errors.intervalSeconds && (
                  <p className="text-xs text-rose-500">{errors.intervalSeconds.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (Milliseconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  {...register("timeoutMs", { valueAsNumber: true })}
                />
                {errors.timeoutMs && (
                  <p className="text-xs text-rose-500">{errors.timeoutMs.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedStatus">Expected HTTP Status Codes</Label>
              <Input
                id="expectedStatus"
                {...register("expectedStatusCodes")}
              />
              {errors.expectedStatusCodes && (
                <p className="text-xs text-rose-500">{errors.expectedStatusCodes.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" render={<Link href={`/endpoints/${endpointId}`} />}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function EditEndpointPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading form...</div>}>
      <EditEndpointContent />
    </React.Suspense>
  );
}

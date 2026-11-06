"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Save, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function NewEndpointPage() {
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("https://");
  const [method, setMethod] = React.useState("GET");
  const [interval, setInterval] = React.useState("300");
  const [timeout, setTimeoutVal] = React.useState("10000");
  const [expectedStatus, setExpectedStatus] = React.useState("200");

  const handleTestNow = () => {
    toast.info("Test check will be executed via worker in Phase 7.");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Endpoint will be persisted into PostgreSQL in Phase 6.");
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

      <form onSubmit={handleSave} className="space-y-6">
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="method">Method</Label>
                <select
                  id="method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                  <option value="HEAD">HEAD</option>
                </select>
              </div>

              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="url">Target URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://api.yourdomain.com/v1/health"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

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
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="60">Every 1 minute</option>
                <option value="180">Every 3 minutes</option>
                <option value="300">Every 5 minutes (Recommended)</option>
                <option value="600">Every 10 minutes</option>
                <option value="1800">Every 30 minutes</option>
                <option value="3600">Every 1 hour</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (Milliseconds)</Label>
              <Input
                id="timeout"
                type="number"
                min="1000"
                max="30000"
                step="500"
                value={timeout}
                onChange={(e) => setTimeoutVal(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base">3. Health Assertions</CardTitle>
            <CardDescription className="text-xs">
              Validation rules that determine whether the endpoint is marked UP or DOWN.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expectedStatus">Expected HTTP Status Codes</Label>
              <Input
                id="expectedStatus"
                placeholder="200, 201, 204"
                value={expectedStatus}
                onChange={(e) => setExpectedStatus(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Comma-separated list of acceptable status codes.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestNow}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Test Endpoint Now
          </Button>

          <div className="flex items-center gap-3">
            <Button variant="ghost" render={<Link href="/endpoints" />}>
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              Save & Start Monitoring
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

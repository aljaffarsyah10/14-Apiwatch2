"use client";

import * as React from "react";
import Link from "next/link";
import {
  Radio,
  BellRing,
  ArrowRight,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 sm:py-32 border-b border-border/60 bg-linear-to-b from-background via-muted/10 to-background">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
            <div className="flex justify-center">
              <Badge variant="outline" className="px-3 py-1 border-primary/30 text-primary text-xs gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
                Automated 24/7 API Health Monitoring
              </Badge>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
              Know when your APIs fail <br className="hidden sm:inline" />
              <span className="text-primary">before your users do</span>.
            </h1>

            <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
              APIWatch executes scheduled HTTP/HTTPS health checks with deep assertion validation,
              enterprise-grade SSRF defense, and instant incident notification.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" render={<Link href="/dashboard" />} className="gap-2 w-full sm:w-auto h-12 px-6 text-base">
                Launch Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" render={<Link href="/login" />} className="w-full sm:w-auto h-12 px-6 text-base">
                Sign In
              </Button>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Engineered for developer reliability
            </h2>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              Built on a dedicated Node.js worker and BullMQ scheduler to guarantee continuous execution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <Radio className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Periodic Health Checks</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Automated checks from 1 to 60-minute intervals with millisecond latency resolution.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-2.5">
                <p>• Status code verification (2xx, 3xx, 4xx, 5xx)</p>
                <p>• Response body pattern and string matching</p>
                <p>• Custom request headers and JSON payloads</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center text-success mb-2">
                  <Lock className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Strict SSRF & IP Pinning</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Advanced multi-layer security blocking private IP ranges and preventing DNS rebinding.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-2.5">
                <p>• RFC1918 & Cloud metadata blocking</p>
                <p>• Pre-request DNS resolution & subnet validation</p>
                <p>• AES-256-GCM encrypted authorization tokens</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center text-warning mb-2">
                  <BellRing className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Incident Lifecycle & Alerts</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Automated downtime tracking with recovery verification and email notifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-2.5">
                <p>• Automatic OPEN and RESOLVED transitions</p>
                <p>• Check-based SLA uptime calculations</p>
                <p>• Latency percentiles (p50, p90, p99)</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

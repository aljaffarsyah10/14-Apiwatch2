"use client";

import * as React from "react";
import Link from "next/link";
import {
  Radio,
  BellRing,
  ArrowRight,
  Lock,
  Play,
  Activity,
  Terminal,
  Zap,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";

export default function LandingPage() {
  const [probeRunning, setProbeRunning] = React.useState(false);
  const [probeResult, setProbeResult] = React.useState<{
    status: number;
    latency: number;
    dnsTime: number;
    tlsVerified: boolean;
    assertions: string[];
  } | null>({
    status: 200,
    latency: 38,
    dnsTime: 4,
    tlsVerified: true,
    assertions: ["HTTP 200 OK", "Body contains 'status':'healthy'", "SSL/TLS Valid"],
  });

  const handleSimulateProbe = () => {
    setProbeRunning(true);
    setProbeResult(null);
    setTimeout(() => {
      setProbeResult({
        status: 200,
        latency: Math.floor(Math.random() * 25) + 30,
        dnsTime: Math.floor(Math.random() * 3) + 2,
        tlsVerified: true,
        assertions: ["HTTP 200 OK", "Body contains 'status':'healthy'", "SSL/TLS Valid"],
      });
      setProbeRunning(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary/20">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero Section with radial glow & subtle grid */}
        <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24 border-b border-border/60 bg-radial-glow">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
            {/* Live Indicator Pill */}
            <div className="flex justify-center">
              <Badge
                variant="outline"
                className="px-3.5 py-1.5 border-primary/30 bg-primary/5 text-primary text-xs sm:text-sm font-medium gap-2 shadow-xs backdrop-blur-xs"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
                <span>Automated 24/7 API Health Monitoring Platform</span>
                <span className="hidden sm:inline-block text-muted-foreground/60">•</span>
                <span className="hidden sm:inline-block text-muted-foreground font-normal">v2.0 Hardened</span>
              </Badge>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.1]">
              Know when your APIs fail <br className="hidden sm:inline" />
              <span className="bg-linear-to-r from-primary via-indigo-500 to-primary/80 bg-clip-text text-transparent">
                before your users do
              </span>
              .
            </h1>

            {/* Sub-headline */}
            <p className="max-w-2xl mx-auto text-base sm:text-xl text-muted-foreground leading-relaxed">
              APIWatch executes scheduled HTTP/HTTPS health checks with deep assertion verification,
              strict SSRF defense with IP pinning, and automated incident recovery tracking.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <Button
                size="lg"
                render={<Link href="/dashboard" />}
                className="gap-2 w-full sm:w-auto h-12 px-7 text-base font-semibold shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 transition-all"
              >
                Launch Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                render={<Link href="/status" />}
                className="gap-2 w-full sm:w-auto h-12 px-7 text-base font-semibold border-border/80 hover:bg-muted/60 transition-all"
              >
                <Activity className="h-4 w-4 text-success" />
                View Live Status Board
              </Button>
            </div>

            {/* Interactive Live Monitor Terminal Widget */}
            <div className="pt-8 max-w-3xl mx-auto text-left">
              <div className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md shadow-xl overflow-hidden">
                {/* Terminal Window Header */}
                <div className="bg-muted/40 px-4 py-3 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-destructive/80 inline-block"></span>
                    <span className="h-3 w-3 rounded-full bg-warning/80 inline-block"></span>
                    <span className="h-3 w-3 rounded-full bg-success/80 inline-block"></span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5" /> apiwatch probe worker // live-test
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSimulateProbe}
                    disabled={probeRunning}
                    className="h-7 text-xs gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Play className={`h-3 w-3 ${probeRunning ? "animate-spin" : ""}`} />
                    {probeRunning ? "Probing..." : "Run Test Probe"}
                  </Button>
                </div>

                {/* Terminal Body */}
                <div className="p-4 sm:p-5 font-mono text-xs sm:text-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/40 text-muted-foreground">
                    <div className="flex items-center gap-2 truncate">
                      <Badge variant="outline" className="font-mono text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                        GET
                      </Badge>
                      <span className="text-foreground font-semibold truncate">https://api.gateway.example.com/health</span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Cadence: every 60s</span>
                  </div>

                  {probeRunning ? (
                    <div className="py-6 text-center space-y-2 text-muted-foreground">
                      <div className="inline-block animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                      <p className="text-xs">Resolving DNS & validating SSRF safety rules...</p>
                    </div>
                  ) : probeResult ? (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
                          <span className="text-[11px] text-muted-foreground block">HTTP Status</span>
                          <span className="font-bold text-success text-sm flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="h-3.5 w-3.5" /> {probeResult.status} OK
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
                          <span className="text-[11px] text-muted-foreground block">Round-trip Time</span>
                          <span className="font-bold text-foreground text-sm tabular-nums mt-0.5">
                            {probeResult.latency} ms
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
                          <span className="text-[11px] text-muted-foreground block">DNS Lookup</span>
                          <span className="font-bold text-foreground text-sm tabular-nums mt-0.5">
                            {probeResult.dnsTime} ms
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
                          <span className="text-[11px] text-muted-foreground block">SSRF Filter</span>
                          <span className="font-bold text-success text-sm flex items-center gap-1 mt-0.5">
                            <Lock className="h-3.5 w-3.5" /> Pinned
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <span className="text-muted-foreground">Assertions:</span>
                        {probeResult.assertions.map((assertion, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/10 text-success text-xs font-semibold"
                          >
                            <CheckCircle2 className="h-3 w-3" /> {assertion}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Metrics Strip */}
        <section className="border-b border-border/60 bg-muted/20 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              <div className="space-y-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight tabular-nums">99.99%</span>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Uptime SLA Target</p>
              </div>
              <div className="space-y-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight tabular-nums">&lt;15s</span>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Outage Detection</p>
              </div>
              <div className="space-y-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight tabular-nums">RFC 1918</span>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">SSRF Defense & IP Pinning</p>
              </div>
              <div className="space-y-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight tabular-nums">1-60m</span>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Configurable Intervals</p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-xs">
              Built for Developer Teams
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Engineered for absolute reliability
            </h2>
            <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Powered by BullMQ scheduler and dedicated background worker processes to guarantee continuous health execution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <Card className="border border-border/80 bg-card/60 hover:border-primary/40 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3 shadow-xs">
                  <Radio className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Periodic Health Checks</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Automated checks from 1 to 60-minute intervals with millisecond latency resolution.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-2.5">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>Status code verification (2xx, 3xx, 4xx, 5xx)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>Response body regex &amp; string pattern matching</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>Encrypted custom headers &amp; JSON payloads</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 2 */}
            <Card className="border border-border/80 bg-card/60 hover:border-success/40 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="h-11 w-11 rounded-xl bg-success/10 flex items-center justify-center text-success mb-3 shadow-xs">
                  <Lock className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Strict SSRF &amp; IP Pinning</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Multi-layer security blocking private IP ranges and preventing DNS rebinding exploits.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-2.5">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>RFC1918 &amp; Cloud metadata (169.254.169.254) blocking</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>Pre-request DNS resolution &amp; strict subnet validation</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>AES-256-GCM encrypted authorization tokens</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 3 */}
            <Card className="border border-border/80 bg-card/60 hover:border-warning/40 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="h-11 w-11 rounded-xl bg-warning/10 flex items-center justify-center text-warning mb-3 shadow-xs">
                  <BellRing className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Incident Lifecycle &amp; Webhooks</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Automated downtime tracking with recovery verification and multi-channel alerts.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-2.5">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <span>Automatic OPEN and RESOLVED state transitions</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <span>Native Discord, Slack, and Email alert webhooks</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <span>Latency percentiles (p50, p90, p99) calculation</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Architecture Section */}
        <section id="architecture" className="py-20 border-t border-border/60 bg-muted/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3">
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-xs">
                Resilient Architecture
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                How APIWatch evaluates health
              </h2>
              <p className="text-base text-muted-foreground max-w-xl mx-auto">
                Decoupled architecture guarantees zero web request blocking and consistent execution cadences.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl border border-border/80 bg-card/60 space-y-2 relative">
                <span className="text-xs font-mono font-bold text-primary">01 // SCHEDULER</span>
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-base">BullMQ &amp; Redis</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Repeatable background jobs queue health probes on scheduled intervals without blocking main thread.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-border/80 bg-card/60 space-y-2 relative">
                <span className="text-xs font-mono font-bold text-success">02 // SECURITY</span>
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-success" />
                  <h3 className="font-semibold text-base">SSRF IP Guard</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Resolves DNS records and blocks private, loopback, link-local, and cloud metadata subnets before socket connect.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-border/80 bg-card/60 space-y-2 relative">
                <span className="text-xs font-mono font-bold text-info">03 // PROBING</span>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-info" />
                  <h3 className="font-semibold text-base">HTTP Executor</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Dispatches custom headers, payloads, measures high-resolution latency, and validates status codes &amp; body strings.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-border/80 bg-card/60 space-y-2 relative">
                <span className="text-xs font-mono font-bold text-warning">04 // INCIDENT</span>
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-warning" />
                  <h3 className="font-semibold text-base">State Machine</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Transitions between UP and DOWN states, records incident duration, and dispatches webhooks with zero duplicate noise.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Security & SSRF Callout */}
        <section id="security" className="py-20 border-t border-border/60">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-border/80 bg-linear-to-b from-card via-card/80 to-muted/20 p-8 sm:p-12 shadow-xl space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <Badge variant="outline" className="border-success/30 bg-success/10 text-success text-xs font-semibold gap-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    Enterprise Security Standard
                  </Badge>
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Zero Risk of Server-Side Request Forgery
                  </h3>
                </div>
                <Button render={<Link href="/dashboard" />} className="gap-2 shrink-0">
                  Try Protected Probing <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Allowing users to monitor custom URLs introduces severe SSRF vulnerabilities if internal services can be probed.
                APIWatch inspects every resolved IP against banned CIDRs (including 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, and AWS/GCP 169.254.169.254)
                and pins DNS lookups to eliminate DNS rebinding attacks entirely.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                  <span className="text-xs font-semibold text-foreground">Cloud Metadata Shield</span>
                  <p className="text-xs text-muted-foreground">Blocks 169.254.169.254 and IPv6 link-local addresses.</p>
                </div>
                <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                  <span className="text-xs font-semibold text-foreground">DNS Rebinding Immunity</span>
                  <p className="text-xs text-muted-foreground">Custom Agent pins socket connection to validated IP.</p>
                </div>
                <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                  <span className="text-xs font-semibold text-foreground">AES-256 Token Vault</span>
                  <p className="text-xs text-muted-foreground">Sensitive headers encrypted with GCM authenticated tags.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="py-20 border-t border-border/60 bg-radial-glow text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Ready to guarantee your API availability?
            </h2>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              Set up your first endpoint in under 60 seconds. Start monitoring uptime, latency, and incident lifecycle today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <Button size="lg" render={<Link href="/dashboard" />} className="h-12 px-8 text-base gap-2 shadow-md shadow-primary/25">
                <Sparkles className="h-4 w-4" />
                Get Started Free
              </Button>
              <Button size="lg" variant="outline" render={<Link href="/login" />} className="h-12 px-8 text-base">
                Sign In
              </Button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

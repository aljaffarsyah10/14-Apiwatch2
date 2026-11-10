"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Zap, Shield, Sparkles, HelpCircle, ArrowRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = React.useState<"MONTHLY" | "ANNUAL">("MONTHLY");

  const plans = [
    {
      id: "FREE",
      name: "Free Starter",
      badge: "Forever Free",
      description: "For solo developers and personal projects looking for basic availability checks.",
      price: "$0",
      period: "forever",
      cta: "Get Started Free",
      ctaLink: "/register",
      popular: false,
      features: [
        "Up to 5 monitored endpoints",
        "5-minute check intervals",
        "24-hour log & metric retention",
        "Email outage alerts (1 recipient)",
        "Standard public status page",
        "HTTP, HTTPS, POST, GET, PUT",
        "Response time latency metrics",
      ],
      notIncluded: [
        "SSL certificate expiry tracking",
        "Discord, Slack & Webhook alerts",
        "Custom status page branding",
        "SLA report exports",
      ],
    },
    {
      id: "PRO",
      name: "Pro Engineer",
      badge: "Most Popular",
      description: "Fast probes, SSL alerts, and instant team notifications for production apps.",
      price: billingCycle === "ANNUAL" ? "$15.83" : "$19",
      period: "per month",
      annualNote: billingCycle === "ANNUAL" ? "Billed annually ($190/yr)" : "Billed monthly",
      cta: "Start 14-Day Free Trial",
      ctaLink: "/register?plan=PRO",
      popular: true,
      features: [
        "Up to 50 monitored endpoints",
        "1-minute check intervals (60s)",
        "30 days log & metric retention",
        "SSL/TLS certificate auto-monitoring",
        "Discord, Slack & custom Webhook alerts",
        "Branded public status page",
        "Full CSV & JSON report exports",
        "Custom request headers & assertion rules",
        "14-day free trial without commitment",
      ],
      notIncluded: [
        "10-second sub-minute probes",
        "Custom domain status pages",
        "99.9% uptime SLA guarantee",
      ],
    },
    {
      id: "ENTERPRISE",
      name: "Enterprise Scale",
      badge: "Maximum Resilience",
      description: "Sub-minute probes, custom domains, and dedicated reliability engineering support.",
      price: billingCycle === "ANNUAL" ? "$82.50" : "$99",
      period: "per month",
      annualNote: billingCycle === "ANNUAL" ? "Billed annually ($990/yr)" : "Billed monthly",
      cta: "Upgrade to Enterprise",
      ctaLink: "/register?plan=ENTERPRISE",
      popular: false,
      features: [
        "Up to 500 monitored endpoints",
        "Ultra-fast 10-second check intervals",
        "365 days (1 full year) data retention",
        "Unlimited notification channels",
        "Status page on custom CNAME domain",
        "Priority worker probe queue",
        "99.9% uptime SLA guarantee",
        "Audit logs & compliance reporting",
        "Dedicated technical account manager",
      ],
      notIncluded: [],
    },
  ];

  const faqs = [
    {
      q: "How does the 14-day Free Trial work?",
      a: "Every new account automatically starts with 14 days of the Pro Engineer plan completely free. You can monitor up to 50 endpoints with 1-minute intervals and full webhook alerts. No credit card is required upfront.",
    },
    {
      q: "What happens when my free trial expires?",
      a: "If you choose not to upgrade, your account automatically transitions to the Free Starter tier. Your endpoints will continue to be monitored safely within Free limits (up to 5 endpoints at 5-minute intervals).",
    },
    {
      q: "Are payments handled securely?",
      a: "Yes. All billing is processed via industry-standard payment providers with TLS encryption and PCI-DSS Level 1 compliance. We also support sandbox testing mode for development and staging.",
    },
    {
      q: "Can I cancel or change my plan anytime?",
      a: "Yes, you can upgrade, downgrade, or cancel your subscription at any time directly from your dashboard settings. Upgrades take effect immediately.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl rounded-full" />
      </div>

      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              APIWatch
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-900">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-500/25">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <Badge variant="outline" className="px-3 py-1 mb-4 border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-medium text-xs">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-400 inline" />
            Simple, Transparent Pricing
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight">
            Enterprise-grade monitoring, <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-indigo-200 bg-clip-text text-transparent">
              priced for every team.
            </span>
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            Monitor API uptime, prevent silent outages, and keep your customers informed.
            Start with our 14-day free trial on Pro. No credit card required.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-sm font-medium ${billingCycle === "MONTHLY" ? "text-white" : "text-slate-400"}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === "MONTHLY" ? "ANNUAL" : "MONTHLY")}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-indigo-500 transition-transform ${
                  billingCycle === "ANNUAL" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className={`text-sm font-medium flex items-center gap-1.5 ${billingCycle === "ANNUAL" ? "text-white" : "text-slate-400"}`}>
              Annual
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-1.5 py-0">
                Save 20%
              </Badge>
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 items-stretch">
          {plans.map((p) => (
            <Card
              key={p.id}
              className={`flex flex-col relative transition-all duration-300 ${
                p.popular
                  ? "border-indigo-500/80 bg-slate-900/90 shadow-2xl shadow-indigo-500/10 ring-1 ring-indigo-500/40 md:-translate-y-2"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-xs px-3 py-0.5 shadow-md">
                    {p.badge}
                  </Badge>
                </div>
              )}
              <CardHeader className="pt-6">
                <CardTitle className="text-xl font-bold text-white flex items-center justify-between">
                  {p.name}
                  {!p.popular && p.badge && (
                    <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-xs font-normal">
                      {p.badge}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-slate-400 min-h-[44px] text-sm mt-2">
                  {p.description}
                </CardDescription>
                <div className="pt-4 flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-white">{p.price}</span>
                  <span className="text-sm text-slate-400">{p.period}</span>
                </div>
                {p.annualNote && (
                  <p className="text-xs text-indigo-300 font-medium mt-1">{p.annualNote}</p>
                )}
              </CardHeader>
              <CardContent className="flex-1 space-y-4 pt-2">
                <div className="h-px bg-slate-800/80 w-full" />
                <ul className="space-y-2.5 text-sm">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-slate-200">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                  {p.notIncluded.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-slate-500 line-through">
                      <div className="h-4 w-4 rounded-full border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] leading-none text-slate-600">×</span>
                      </div>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="pt-4">
                <Link href={p.ctaLink} className="w-full">
                  <Button
                    className={`w-full font-semibold ${
                      p.popular
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                    }`}
                  >
                    {p.cta}
                    <ArrowRight className="w-4 h-4 ml-1.5 inline" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Feature Comparison Highlights */}
        <section className="mt-28">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">Enterprise-Grade Reliability Engine</h2>
            <p className="text-slate-400 text-sm">Built from the ground up for high-availability production workloads.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/30">
              <Zap className="h-8 w-8 text-indigo-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Sub-Minute Health Probes</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Detect failures in seconds, not hours. Probes evaluate HTTP status, custom assertions, and latency budgets.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/30">
              <Shield className="h-8 w-8 text-emerald-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">SSL/TLS Expiry Protection</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Automatic certificate chain inspection notifies your engineering team 30, 14, and 7 days prior to expiry.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/30">
              <Activity className="h-8 w-8 text-violet-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Automated Incident Lifecycle</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Eliminates alert fatigue with consecutive failure thresholds. Automatically opens and resolves incidents.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mt-28 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <HelpCircle className="h-8 w-8 text-indigo-400 mx-auto mb-3" />
            <h2 className="text-3xl font-bold text-white mb-2">Frequently Asked Questions</h2>
            <p className="text-slate-400 text-sm">Everything you need to know about plans and billing.</p>
          </div>
          <div className="space-y-4">
            {faqs.map((f, i) => (
              <div key={i} className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
                <h3 className="text-base font-semibold text-white mb-2">{f.q}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

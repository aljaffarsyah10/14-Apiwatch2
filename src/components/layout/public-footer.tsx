"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, ShieldCheck, Heart } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-border/80 bg-background/50 text-sm text-muted-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-base text-foreground tracking-tight">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Activity className="h-4 w-4" />
              </div>
              <span>APIWatch</span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed pr-4">
              Enterprise-grade automated API health monitoring, distributed background probe worker, and instant downtime alerting.
            </p>
            <div className="flex items-center gap-1.5 pt-1 text-xs text-success font-medium">
              <span className="h-2 w-2 rounded-full bg-success"></span>
              All Systems Operational
            </div>
          </div>

          {/* Product links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Product</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/#features" className="hover:text-foreground transition-colors">
                  Health Checks
                </Link>
              </li>
              <li>
                <Link href="/#architecture" className="hover:text-foreground transition-colors">
                  BullMQ Architecture
                </Link>
              </li>
              <li>
                <Link href="/status" className="hover:text-foreground transition-colors">
                  Public Status Board
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                  Live Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Security & Reliability */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Security</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5 text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                <span>SSRF IP Guard</span>
              </li>
              <li>
                <span className="text-muted-foreground">RFC1918 & Cloud Metadata Blocking</span>
              </li>
              <li>
                <span className="text-muted-foreground">AES-256-GCM Token Encryption</span>
              </li>
              <li>
                <span className="text-muted-foreground">Zero Cloud Egress to Private Nets</span>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/login" className="hover:text-foreground transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-foreground transition-colors">
                  Create Workspace
                </Link>
              </li>
              <li>
                <Link href="/status" className="hover:text-foreground transition-colors">
                  Global System Status
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span>© 2026 APIWatch Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1 text-muted-foreground">
              Engineered with <Heart className="h-3 w-3 text-destructive fill-destructive" /> for reliability
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

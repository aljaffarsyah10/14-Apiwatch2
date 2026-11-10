"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-radial-glow bg-background text-foreground">
      <header className="flex items-center justify-between p-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-xs shadow-primary/20 transition-transform group-hover:scale-105">
            <Activity className="h-5 w-5" />
          </div>
          <span className="font-bold text-foreground tracking-tight">APIWatch</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground border-t border-border/40 flex flex-col sm:flex-row items-center justify-center gap-2">
        <span>© 2026 APIWatch. Automated API Health Monitoring.</span>
        <span className="hidden sm:inline">•</span>
        <span className="inline-flex items-center gap-1 text-success">
          <ShieldCheck className="h-3.5 w-3.5" /> Enterprise SSRF Guard
        </span>
      </footer>
    </div>
  );
}

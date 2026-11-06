"use client";

import * as React from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-muted/20">
      <header className="flex items-center justify-between p-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Activity className="h-5 w-5" />
          </div>
          <span>APIWatch</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground border-t border-border/40">
        © 2026 APIWatch. Secured with Auth.js & PostgreSQL.
      </footer>
    </div>
  );
}

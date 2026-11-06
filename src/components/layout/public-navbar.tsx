"use client";

import * as React from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Activity className="h-5 w-5" />
          </div>
          <span>APIWatch</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/#features" className="transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="/#architecture" className="transition-colors hover:text-foreground">
            Architecture
          </Link>
          <Link href="/#pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" size="sm" render={<Link href="/login" />}>
            Sign In
          </Button>
          <Button size="sm" render={<Link href="/dashboard" />}>
            Dashboard
          </Button>
        </div>
      </div>
    </header>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, Menu, X, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-sm shadow-primary/25 transition-transform group-hover:scale-105">
            <Activity className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground tracking-tight">APIWatch</span>
            <span className="hidden sm:inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              v2.0
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
          <Link href="/#features" className="transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="/#architecture" className="transition-colors hover:text-foreground">
            Architecture
          </Link>
          <Link href="/#security" className="transition-colors hover:text-foreground">
            SSRF Security
          </Link>
          <Link
            href="/status"
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span>Live Status</span>
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/login" />}
            className="hidden sm:inline-flex text-muted-foreground hover:text-foreground"
          >
            Sign In
          </Button>

          <Button
            size="sm"
            render={<Link href="/dashboard" />}
            className="gap-1.5 shadow-xs shadow-primary/20"
          >
            Dashboard
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-muted-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background/95 backdrop-blur-md px-4 py-4 space-y-3">
          <nav className="flex flex-col space-y-2.5 text-sm font-medium">
            <Link
              href="/#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-muted text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="/#architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-muted text-foreground transition-colors"
            >
              Architecture
            </Link>
            <Link
              href="/#security"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-muted text-foreground transition-colors"
            >
              SSRF Security
            </Link>
            <Link
              href="/status"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-foreground transition-colors"
            >
              <span className="h-2 w-2 rounded-full bg-success"></span>
              Live Status Board
            </Link>
          </nav>
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-primary hover:underline px-3 py-2"
            >
              Sign In to Workspace
            </Link>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              SSRF Guard Active
            </span>
          </div>
        </div>
      )}
    </header>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { Activity } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-border/80 bg-background/50 py-10 text-sm text-muted-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground">APIWatch</span>
          <span className="text-xs">© 2026 APIWatch. All rights reserved.</span>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/status" className="hover:text-foreground transition-colors">
            Status
          </Link>
        </div>
      </div>
    </footer>
  );
}

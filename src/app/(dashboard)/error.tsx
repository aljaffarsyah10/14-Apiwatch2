"use client";

import * as React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const referenceId = error.digest || "err_section_recovery";

  React.useEffect(() => {
    console.error("[DashboardError Caught]", {
      name: error.name,
      message: error.message,
      digest: error.digest,
      referenceId,
    });
  }, [error, referenceId]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-lg">
        <div className="h-12 w-12 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground">Failed to load content</h2>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            We encountered a problem loading this section. Your other monitors and background tasks continue to operate safely.
          </p>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg border border-border text-xs font-mono text-muted-foreground select-all">
          Reference ID: {referenceId}
        </div>

        <div className="pt-2">
          <Button
            onClick={() => reset()}
            className="w-full gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reload Section
          </Button>
        </div>
      </div>
    </div>
  );
}

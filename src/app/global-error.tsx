"use client";

import * as React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const referenceId = error.digest || "err_system_recovery";

  React.useEffect(() => {
    // Log exception to console in structured format
    console.error("[GlobalError Caught]", {
      name: error.name,
      message: error.message,
      digest: error.digest,
      referenceId,
    });
  }, [error, referenceId]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-white">Something went wrong</h1>
            <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
              An unexpected error occurred while rendering this page. Our engineering team has been notified.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-400 select-all">
            Reference ID: {referenceId}
          </div>

          <div className="pt-2">
            <Button
              onClick={() => reset()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}

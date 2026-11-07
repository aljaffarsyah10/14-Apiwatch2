import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  description?: string;
  code?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  description,
  code,
  onRetry,
  className,
}: ErrorStateProps) {
  const displayMsg = description || message || "An unexpected error occurred.";

  return (
    <div
      className={cn(
        "rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center sm:p-8",
        className
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 mb-3">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-rose-600 dark:text-rose-400">
        {title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{displayMsg}</p>
      {code && (
        <p className="mt-2 font-mono text-xs text-rose-500/80">Code: {code}</p>
      )}
      {onRetry && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="gap-2 border-rose-500/30 hover:bg-rose-500/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

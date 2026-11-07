import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  type?: "card" | "table" | "chart" | "form";
  variant?: "card" | "table" | "chart" | "form";
  count?: number;
  className?: string;
}

export function LoadingSkeleton({
  type,
  variant,
  count = 1,
  className,
}: LoadingSkeletonProps) {
  const actualType = variant || type || "card";

  if (actualType === "card") {
    return (
      <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
        {Array.from({ length: count || 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border p-5 space-y-3"
          >
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (actualType === "chart") {
    return (
      <div className={cn("rounded-xl border border-border p-6 space-y-4", className)}>
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (actualType === "table") {
    return (
      <div className={cn("rounded-xl border border-border divide-y divide-border", className)}>
        <div className="p-4 flex gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 flex gap-4 items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4 rounded-xl border border-border p-6", className)}>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

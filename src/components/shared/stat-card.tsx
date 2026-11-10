import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "py-0 relative overflow-hidden transition-all duration-200 border border-border/70 hover:border-border hover:shadow-md hover:-translate-y-0.5 bg-card/90",
        className
      )}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          {icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 border border-border/50 text-foreground transition-transform">
              {icon}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
            {value}
          </span>
          {trend && (
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-semibold flex items-center gap-1",
                trend.isPositive
                  ? "bg-success/15 text-success border border-success/20"
                  : "bg-destructive/15 text-destructive border border-destructive/20"
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {trend.value}
            </span>
          )}
        </div>

        {description && (
          <p className="text-xs leading-normal text-muted-foreground pt-0.5">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

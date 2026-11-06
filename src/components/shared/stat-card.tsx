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
    <Card className={cn("overflow-hidden border border-border/80 shadow-xs", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon && (
            <div className="h-8 w-8 rounded-md bg-muted/60 flex items-center justify-center text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
            {value}
          </span>
          {trend && (
            <span
              className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-emerald-500" : "text-rose-500"
              )}
            >
              {trend.value}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

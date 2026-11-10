import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type EndpointStatusType = "UP" | "DOWN" | "PAUSED" | "PENDING";

interface StatusBadgeProps {
  status: EndpointStatusType;
  className?: string;
  showIcon?: boolean;
}

const STATUS_STYLES: Record<
  EndpointStatusType,
  { label: string; badge: string; dot: string; pulse?: boolean }
> = {
  UP: {
    label: "Operational",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    dot: "bg-emerald-500",
  },
  DOWN: {
    label: "Down",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    dot: "bg-rose-500",
    pulse: true,
  },
  PAUSED: {
    label: "Paused",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    dot: "bg-amber-500",
  },
  PENDING: {
    label: "Pending",
    badge: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground/60",
  },
};

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 font-semibold text-xs rounded-full shadow-2xs tracking-normal",
        style.badge,
        className
      )}
    >
      {showIcon && (
        <span className="relative flex h-2 w-2">
          {style.pulse && (
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", style.dot)} />
          )}
          <span className={cn("relative inline-flex rounded-full h-2 w-2", style.dot)} />
        </span>
      )}
      <span>{style.label}</span>
    </Badge>
  );
}

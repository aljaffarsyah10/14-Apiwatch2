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
  { label: string; badge: string; dot: string }
> = {
  UP: {
    label: "Operational",
    badge: "bg-success/10 text-success border-success/20",
    dot: "bg-success",
  },
  DOWN: {
    label: "Down",
    badge: "bg-destructive/10 text-destructive border-destructive/25",
    dot: "bg-destructive animate-pulse",
  },
  PAUSED: {
    label: "Paused",
    badge: "bg-warning/10 text-warning border-warning/20",
    dot: "bg-warning",
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
      className={cn("inline-flex items-center gap-1.5 font-semibold", style.badge, className)}
    >
      {showIcon && (
        <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      )}
      <span>{style.label}</span>
    </Badge>
  );
}

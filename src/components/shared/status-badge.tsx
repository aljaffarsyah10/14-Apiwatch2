import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, PauseCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type EndpointStatusType = "UP" | "DOWN" | "PAUSED" | "PENDING";

interface StatusBadgeProps {
  status: EndpointStatusType;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  switch (status) {
    case "UP":
      return (
        <Badge
          variant="outline"
          className={cn(
            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium inline-flex items-center gap-1.5",
            className
          )}
        >
          {showIcon && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
          <span>UP</span>
        </Badge>
      );
    case "DOWN":
      return (
        <Badge
          variant="outline"
          className={cn(
            "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-medium inline-flex items-center gap-1.5",
            className
          )}
        >
          {showIcon && <AlertTriangle className="h-3.5 w-3.5 text-rose-500 animate-pulse" />}
          <span>DOWN</span>
        </Badge>
      );
    case "PAUSED":
      return (
        <Badge
          variant="outline"
          className={cn(
            "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium inline-flex items-center gap-1.5",
            className
          )}
        >
          {showIcon && <PauseCircle className="h-3.5 w-3.5 text-amber-500" />}
          <span>PAUSED</span>
        </Badge>
      );
    case "PENDING":
    default:
      return (
        <Badge
          variant="outline"
          className={cn(
            "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20 font-medium inline-flex items-center gap-1.5",
            className
          )}
        >
          {showIcon && <Clock className="h-3.5 w-3.5 text-zinc-400" />}
          <span>PENDING</span>
        </Badge>
      );
  }
}

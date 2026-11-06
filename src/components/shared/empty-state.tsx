import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center",
        className
      )}
    >
      {icon && (
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted/80 text-muted-foreground mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {(actionLabel && (onAction || actionHref)) && (
        <div className="mt-6">
          {actionHref ? (
            <Button render={<Link href={actionHref} />}>{actionLabel}</Button>
          ) : (
            <Button onClick={onAction}>{actionLabel}</Button>
          )}
        </div>
      )}
    </div>
  );
}

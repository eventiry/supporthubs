"use client";

import { cn } from "@/lib/utils";

const APP_NAME = "Support Hubs";

export interface LoadingProps {
  /** Message shown below the spinner. Default: "Loading…" */
  message?: string;
  /** Use full viewport height and center. Default: true for full-page feel. */
  centered?: boolean;
  /** Optional class for the wrapper. */
  className?: string;
}

/**
 * Centralized loading UI with brand (primary) color.
 * Use anywhere you need a consistent loading state.
 */
export function Loading({
  message = "",
  centered = true,
  className,
}: LoadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        centered && "min-h-[12rem] w-full py-12",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="h-9 w-9 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="text-sm font-medium text-primary">{message}</span>
    </div>
  );
}

/**
 * Inline loading (e.g. inside a card or table cell). Smaller spinner, no min-height.
 */
export function LoadingInline({ message = "Loading…", className }: Omit<LoadingProps, "centered">) {
  return (
    <Loading message={message} centered={false} className={cn("py-6", className)} />
  );
}

/** Skeleton bars for sidebar or list placeholders. Brand-tinted. */
export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)} role="status" aria-label="Loading">
      <div className="h-8 animate-pulse rounded-md bg-primary/10" />
      <div className="h-8 animate-pulse rounded-md bg-primary/10" />
      <div className="h-8 animate-pulse rounded-md bg-primary/10" />
    </div>
  );
}

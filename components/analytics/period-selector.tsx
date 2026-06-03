"use client";

import type { AnalyticsPeriodPreset } from "@/lib/types";
import { cn } from "@/lib/utils";

export const PERIOD_OPTIONS: {
  value: AnalyticsPeriodPreset;
  label: string;
}[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "60d", label: "60 days" },
  { value: "yearly", label: "Yearly" },
  { value: "all", label: "All time" },
];

export interface PeriodSelectorProps {
  value: AnalyticsPeriodPreset;
  onPeriodChange: (period: AnalyticsPeriodPreset) => void;
  disabled?: boolean;
  className?: string;
}

export function PeriodSelector({
  value,
  onPeriodChange,
  disabled,
  className,
}: PeriodSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Analytics time period"
      className={cn(
        "flex flex-wrap gap-2 overflow-x-auto pb-1 scrollbar-thin",
        className
      )}
    >
      {PERIOD_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onPeriodChange(opt.value)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50",
              selected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function PeriodSelectorSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      aria-hidden
    >
      {PERIOD_OPTIONS.map((opt) => (
        <div
          key={opt.value}
          className="h-9 w-20 animate-pulse rounded-full bg-muted sm:w-24"
        />
      ))}
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";

export type PlanBillingInterval = "month" | "year";

export function PlanIntervalToggle({
  value,
  onChange,
  className,
}: {
  value: PlanBillingInterval;
  onChange: (interval: PlanBillingInterval) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-border bg-muted/50 p-1",
        className
      )}
      role="group"
      aria-label="Billing interval"
    >
      <button
        type="button"
        onClick={() => onChange("month")}
        className={cn(
          "rounded-md px-4 py-2 text-sm font-medium transition-colors",
          value === "month"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("year")}
        className={cn(
          "rounded-md px-4 py-2 text-sm font-medium transition-colors",
          value === "year"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Yearly
      </button>
    </div>
  );
}

export function formatPlanPrice(
  plan: { priceMonthly: number | null; priceYearly: number | null },
  interval: PlanBillingInterval,
  options?: { short?: boolean }
): string {
  const monthSuffix = options?.short ? "/mo" : "/month";
  const yearSuffix = options?.short ? "/yr" : "/year";

  if (interval === "month") {
    if (
      plan.priceMonthly != null &&
      plan.priceMonthly === 0 &&
      (plan.priceYearly == null || plan.priceYearly === 0)
    ) {
      return "Free";
    }
    if (plan.priceMonthly != null && plan.priceMonthly > 0) {
      return `£${plan.priceMonthly}${monthSuffix}`;
    }
  } else {
    if (plan.priceYearly != null && plan.priceYearly > 0) {
      return `£${plan.priceYearly}${yearSuffix}`;
    }
    if (
      plan.priceMonthly != null &&
      plan.priceMonthly === 0 &&
      (plan.priceYearly == null || plan.priceYearly === 0)
    ) {
      return "Free";
    }
  }

  return "Contact us";
}

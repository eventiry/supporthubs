"use client";

import { useEffect, useState } from "react";
import {
  ANALYTICS_PERIOD_PRESETS,
  type AnalyticsPeriodSelection,
  type PeriodSelectorDropdownValue,
  isPeriodSelectorDropdownValue,
  selectionToDropdownValue,
  todayDateOnlyUtc,
} from "@/lib/analytics/period";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/select";

export const PERIOD_OPTIONS: {
  value: (typeof ANALYTICS_PERIOD_PRESETS)[number];
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
  value: AnalyticsPeriodSelection;
  onChange: (selection: AnalyticsPeriodSelection) => void;
  disabled?: boolean;
  className?: string;
}

function defaultRangeFrom(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 29);
  return todayDateOnlyUtc(d);
}

export function PeriodSelector({
  value,
  onChange,
  disabled,
  className,
}: PeriodSelectorProps) {
  const [dropdownMode, setDropdownMode] = useState<PeriodSelectorDropdownValue>(() =>
    selectionToDropdownValue(value)
  );
  const isCustomMode =
    dropdownMode === "custom-single" || dropdownMode === "custom-range";

  const [singleDate, setSingleDate] = useState(
    value.kind === "single" ? value.date : todayDateOnlyUtc()
  );
  const [fromDate, setFromDate] = useState(
    value.kind === "range" ? value.fromDate : defaultRangeFrom()
  );
  const [toDate, setToDate] = useState(
    value.kind === "range" ? value.toDate : todayDateOnlyUtc()
  );
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    setDropdownMode(selectionToDropdownValue(value));
    if (value.kind === "single") setSingleDate(value.date);
    if (value.kind === "range") {
      setFromDate(value.fromDate);
      setToDate(value.toDate);
    }
  }, [value]);

  function handleDropdownChange(next: string) {
    if (!isPeriodSelectorDropdownValue(next)) return;
    setCustomError(null);
    setDropdownMode(next);

    if (next === "custom-single") {
      if (value.kind === "single") {
        setSingleDate(value.date);
      } else {
        setSingleDate(todayDateOnlyUtc());
      }
      return;
    }
    if (next === "custom-range") {
      if (value.kind === "range") {
        setFromDate(value.fromDate);
        setToDate(value.toDate);
      } else {
        setFromDate(defaultRangeFrom());
        setToDate(todayDateOnlyUtc());
      }
      return;
    }
    onChange({ kind: "preset", preset: next });
  }

  function applyCustomSelection() {
    setCustomError(null);
    if (dropdownMode === "custom-single") {
      if (!singleDate.trim()) {
        setCustomError("Choose a date.");
        return;
      }
      onChange({ kind: "single", date: singleDate.trim() });
      return;
    }
    if (dropdownMode === "custom-range") {
      const from = fromDate.trim();
      const to = toDate.trim();
      if (!from || !to) {
        setCustomError("Choose both start and end dates.");
        return;
      }
      if (new Date(from) > new Date(to)) {
        setCustomError("Start date must be on or before end date.");
        return;
      }
      onChange({ kind: "range", fromDate: from, toDate: to });
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-auto sm:min-w-[220px]">
          <Label htmlFor="analytics-period" className="sr-only">
            Time period
          </Label>
          <Select
            value={dropdownMode}
            onValueChange={handleDropdownChange}
            disabled={disabled}
          >
            <SelectTrigger id="analytics-period" aria-label="Analytics time period">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Presets</SelectLabel>
                {PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Custom</SelectLabel>
                <SelectItem value="custom-single">Single date</SelectItem>
                <SelectItem value="custom-range">Date range</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {isCustomMode && (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            {dropdownMode === "custom-single" ? (
              <div className="space-y-1.5">
                <Label htmlFor="analytics-single-date">Date</Label>
                <Input
                  id="analytics-single-date"
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  disabled={disabled}
                  className="w-full sm:w-auto"
                />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="analytics-from-date">From</Label>
                  <Input
                    id="analytics-from-date"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    disabled={disabled}
                    className="w-full sm:w-auto"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="analytics-to-date">To</Label>
                  <Input
                    id="analytics-to-date"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    disabled={disabled}
                    className="w-full sm:w-auto"
                  />
                </div>
              </>
            )}
            <Button
              type="button"
              size="sm"
              onClick={applyCustomSelection}
              disabled={disabled}
              className="w-full sm:w-auto"
            >
              Apply
            </Button>
          </div>
        )}
      </div>
      {customError && (
        <p className="text-sm text-destructive" role="alert">
          {customError}
        </p>
      )}
    </div>
  );
}

export function PeriodSelectorSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end", className)}>
      <div className="h-9 w-full animate-pulse rounded-md bg-muted sm:w-[220px]" />
    </div>
  );
}

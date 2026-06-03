/**
 * Analytics period presets — UTC day boundaries (aligned with /api/reports).
 *
 * @example daily   — start of today UTC → end of today UTC
 * @example weekly  — start of current ISO week (Monday) UTC → end of today UTC
 * @example monthly — start of current calendar month UTC → end of today UTC
 * @example 60d     — today − 59 days → end of today UTC (60 inclusive days)
 * @example yearly  — start of current calendar year UTC → end of today UTC
 * @example all     — orgCreatedAt (or fallback) → end of today UTC
 */

export const ANALYTICS_PERIOD_PRESETS = [
  "daily",
  "weekly",
  "monthly",
  "60d",
  "yearly",
  "all",
] as const;

export type AnalyticsPeriodPreset = (typeof ANALYTICS_PERIOD_PRESETS)[number];

export type AnalyticsPeriodResolved = AnalyticsPeriodPreset | "custom";

export class InvalidAnalyticsPeriodError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAnalyticsPeriodError";
  }
}

export interface ResolvedAnalyticsPeriod {
  period: AnalyticsPeriodResolved;
  fromDate: Date;
  toDate: Date;
  fromDateStr: string;
  toDateStr: string;
  label: string;
}

const PERIOD_LABELS: Record<AnalyticsPeriodPreset, string> = {
  daily: "Today",
  weekly: "This week",
  monthly: "This month",
  "60d": "Last 60 days",
  yearly: "This year",
  all: "All time",
};

/** ISO date YYYY-MM-DD in UTC. */
export function toDateOnlyUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function endOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

/** Monday-based week start in UTC. */
function startOfUtcWeek(d: Date): Date {
  const day = d.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const x = startOfUtcDay(d);
  x.setUTCDate(x.getUTCDate() - daysSinceMonday);
  return x;
}

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function startOfUtcYear(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
}

const ALL_TIME_FALLBACK_YEARS = 10;

export function isAnalyticsPeriodPreset(
  value: string
): value is AnalyticsPeriodPreset {
  return (ANALYTICS_PERIOD_PRESETS as readonly string[]).includes(value);
}

/**
 * Resolve preset period to inclusive UTC from/to bounds.
 * @throws InvalidAnalyticsPeriodError for unknown preset strings
 */
export function resolveAnalyticsPeriod(
  period: string,
  options?: { orgCreatedAt?: Date; referenceDate?: Date }
): ResolvedAnalyticsPeriod {
  if (!isAnalyticsPeriodPreset(period)) {
    throw new InvalidAnalyticsPeriodError(
      `Invalid period "${period}". Allowed: ${ANALYTICS_PERIOD_PRESETS.join(", ")}`
    );
  }

  const now = options?.referenceDate ?? new Date();
  const end = endOfUtcDay(now);
  let start: Date;

  switch (period) {
    case "daily":
      start = startOfUtcDay(now);
      break;
    case "weekly":
      start = startOfUtcWeek(now);
      break;
    case "monthly":
      start = startOfUtcMonth(now);
      break;
    case "60d": {
      start = startOfUtcDay(now);
      start.setUTCDate(start.getUTCDate() - 59);
      break;
    }
    case "yearly":
      start = startOfUtcYear(now);
      break;
    case "all": {
      if (options?.orgCreatedAt) {
        start = startOfUtcDay(options.orgCreatedAt);
      } else {
        start = startOfUtcDay(now);
        start.setUTCFullYear(start.getUTCFullYear() - ALL_TIME_FALLBACK_YEARS);
      }
      break;
    }
    default: {
      const _exhaustive: never = period;
      throw new InvalidAnalyticsPeriodError(`Unhandled period: ${_exhaustive}`);
    }
  }

  return {
    period,
    fromDate: start,
    toDate: end,
    fromDateStr: toDateOnlyUtc(start),
    toDateStr: toDateOnlyUtc(end),
    label: PERIOD_LABELS[period],
  };
}

/**
 * Custom inclusive UTC range (validated: from <= to).
 */
export function resolveCustomAnalyticsPeriod(
  fromDateRaw: Date,
  toDateRaw: Date
): ResolvedAnalyticsPeriod {
  if (Number.isNaN(fromDateRaw.getTime()) || Number.isNaN(toDateRaw.getTime())) {
    throw new InvalidAnalyticsPeriodError("Invalid fromDate or toDate");
  }
  const fromDate = startOfUtcDay(fromDateRaw);
  const toDate = endOfUtcDay(toDateRaw);
  if (fromDate.getTime() > toDate.getTime()) {
    throw new InvalidAnalyticsPeriodError(
      "From date must be on or before to date"
    );
  }
  const fromDateStr = toDateOnlyUtc(fromDate);
  const toDateStr = toDateOnlyUtc(toDate);
  return {
    period: "custom",
    fromDate,
    toDate,
    fromDateStr,
    toDateStr,
    label:
      fromDateStr === toDateStr
        ? formatSingleDayLabel(fromDateStr)
        : "Custom range",
  };
}

function formatSingleDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00.000Z");
  if (Number.isNaN(d.getTime())) return "Single date";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** ISO date (YYYY-MM-DD) for today in UTC. */
export function todayDateOnlyUtc(referenceDate?: Date): string {
  return toDateOnlyUtc(referenceDate ?? new Date());
}

export type AnalyticsPeriodSelection =
  | { kind: "preset"; preset: AnalyticsPeriodPreset }
  | { kind: "single"; date: string }
  | { kind: "range"; fromDate: string; toDate: string };

export const DEFAULT_ANALYTICS_PERIOD: AnalyticsPeriodPreset = "monthly";

export function parseAnalyticsSelectionFromSearchParams(
  params: URLSearchParams
): AnalyticsPeriodSelection {
  const from = params.get("fromDate")?.trim();
  const to = params.get("toDate")?.trim();
  if (from && to) {
    if (from === to) return { kind: "single", date: from };
    return { kind: "range", fromDate: from, toDate: to };
  }
  const period = params.get("period")?.trim();
  if (period && isAnalyticsPeriodPreset(period)) {
    return { kind: "preset", preset: period };
  }
  return { kind: "preset", preset: DEFAULT_ANALYTICS_PERIOD };
}

export function analyticsSelectionToSearchParams(
  selection: AnalyticsPeriodSelection
): URLSearchParams {
  const sp = new URLSearchParams();
  if (selection.kind === "preset") {
    sp.set("period", selection.preset);
  } else if (selection.kind === "single") {
    sp.set("fromDate", selection.date);
    sp.set("toDate", selection.date);
  } else {
    sp.set("fromDate", selection.fromDate);
    sp.set("toDate", selection.toDate);
  }
  return sp;
}

export function analyticsSelectionToApiParams(selection: AnalyticsPeriodSelection): {
  period?: AnalyticsPeriodPreset;
  fromDate?: string;
  toDate?: string;
} {
  if (selection.kind === "preset") {
    return { period: selection.preset };
  }
  if (selection.kind === "single") {
    return { fromDate: selection.date, toDate: selection.date };
  }
  return { fromDate: selection.fromDate, toDate: selection.toDate };
}

export function getAnalyticsSelectionDisplayLabel(
  selection: AnalyticsPeriodSelection
): string {
  if (selection.kind === "preset") {
    return PERIOD_LABELS[selection.preset];
  }
  if (selection.kind === "single") {
    return formatSingleDayLabel(selection.date);
  }
  return "Custom range";
}

export type PeriodSelectorDropdownValue =
  | AnalyticsPeriodPreset
  | "custom-single"
  | "custom-range";

export function selectionToDropdownValue(
  selection: AnalyticsPeriodSelection
): PeriodSelectorDropdownValue {
  if (selection.kind === "preset") return selection.preset;
  if (selection.kind === "single") return "custom-single";
  return "custom-range";
}

export function isPeriodSelectorDropdownValue(
  value: string
): value is PeriodSelectorDropdownValue {
  return (
    isAnalyticsPeriodPreset(value) ||
    value === "custom-single" ||
    value === "custom-range"
  );
}

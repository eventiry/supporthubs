/** Locale for analytics number and date display (UK English). */
export const ANALYTICS_LOCALE = "en-GB";

export function formatAnalyticsNumber(value: number): string {
  return value.toLocaleString(ANALYTICS_LOCALE);
}

export function formatAnalyticsWeightKg(value: number): string {
  return `${value.toLocaleString(ANALYTICS_LOCALE, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  })} kg`;
}

export function formatAnalyticsPeriodRange(
  fromDate: string,
  toDate: string
): string {
  const from = new Date(fromDate + "T12:00:00.000Z");
  const to = new Date(toDate + "T12:00:00.000Z");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return `${fromDate} — ${toDate}`;
  }
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  return `${from.toLocaleDateString(ANALYTICS_LOCALE, opts)} — ${to.toLocaleDateString(ANALYTICS_LOCALE, opts)}`;
}

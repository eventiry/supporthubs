import type { AnalyticsData } from "@/lib/types";

/** True when there is no meaningful activity in the selected period. */
export function isAnalyticsDataEmpty(data: AnalyticsData): boolean {
  const noVoucherActivity =
    data.vouchers.issued === 0 &&
    data.clientsServed.redemptions === 0 &&
    data.clientsServed.uniqueClients === 0;

  const noTimeSeriesActivity = data.timeSeries.every(
    (p) => p.issued === 0 && p.redeemed === 0
  );

  return noVoucherActivity && noTimeSeriesActivity;
}

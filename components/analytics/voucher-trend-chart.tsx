"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsTimeSeriesPoint } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";

const COLOR_ISSUED = "hsl(199, 70%, 45%)";
const COLOR_REDEEMED = "hsl(142, 52%, 32%)";

function formatAxisDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00.000Z");
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export interface VoucherTrendChartProps {
  data: AnalyticsTimeSeriesPoint[];
  className?: string;
}

export function VoucherTrendChart({ data, className }: VoucherTrendChartProps) {
  const hasData = data.some((p) => p.issued > 0 || p.redeemed > 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Voucher activity</CardTitle>
        <p className="text-sm text-muted-foreground">
          Issued vs redeemed over the selected period
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p
            className="flex h-[280px] items-center justify-center text-sm text-muted-foreground"
            role="status"
          >
            No voucher activity in this period.
          </p>
        ) : (
          <div
            className="h-[280px] w-full min-w-0"
            role="img"
            aria-label="Chart showing vouchers issued and redeemed over time"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fillIssued" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR_ISSUED} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={COLOR_ISSUED} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="fillRedeemed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR_REDEEMED} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={COLOR_REDEEMED} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatAxisDate}
                  tick={{ fontSize: 11, fill: "hsl(0 0% 45%)" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "hsl(0 0% 45%)" }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(0 0% 90%)",
                    fontSize: "12px",
                  }}
                  labelFormatter={(label) => formatAxisDate(String(label))}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Area
                  type="monotone"
                  dataKey="issued"
                  name="Issued"
                  stroke={COLOR_ISSUED}
                  fill="url(#fillIssued)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="redeemed"
                  name="Redeemed"
                  stroke={COLOR_REDEEMED}
                  fill="url(#fillRedeemed)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

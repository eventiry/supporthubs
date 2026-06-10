"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsPeopleServed } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { formatAnalyticsNumber } from "@/lib/analytics/format";

const BAND_LABELS: Record<string, string> = {
  "0-17": "0–17 (children)",
  "18-24": "18–24",
  "25-44": "25–44",
  "45-64": "45–64",
  "65+": "65+",
};

export interface PeopleByAgeChartProps {
  peopleServed: AnalyticsPeopleServed;
  className?: string;
}

export function PeopleByAgeChart({ peopleServed, className }: PeopleByAgeChartProps) {
  const chartData = peopleServed.byAgeBand.map((row) => ({
    band: row.band,
    label: BAND_LABELS[row.band] ?? row.band,
    count: row.count,
  }));

  const hasData = peopleServed.totalPeople > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">People served by age</CardTitle>
        <p className="text-sm text-muted-foreground">
          {hasData
            ? `${formatAnalyticsNumber(peopleServed.totalPeople)} people across ${formatAnalyticsNumber(peopleServed.redemptionsWithData)} redeemed vouchers with household data`
            : "Household size is recorded when vouchers are issued"}
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p
            className="flex h-[280px] items-center justify-center text-sm text-muted-foreground"
            role="status"
          >
            No household data for redeemed vouchers in this period.
          </p>
        ) : (
          <div
            className="h-[280px] w-full min-w-0"
            role="img"
            aria-label={`Bar chart of people served by age: ${chartData.map((r) => `${r.label} ${r.count}`).join(", ")}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  className="stroke-border"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "hsl(0 0% 45%)" }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={56}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                <Tooltip
                  cursor={{ fill: "hsl(0 0% 96%)" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(0 0% 90%)",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [value, "People"]}
                />
                <Bar
                  dataKey="count"
                  name="People"
                  fill="hsl(142, 52%, 32%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

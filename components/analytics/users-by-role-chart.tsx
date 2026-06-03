"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsUsers } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";

const ROLE_LABELS: Record<keyof AnalyticsUsers["byRole"], string> = {
  admin: "Admin",
  third_party: "Third party",
  back_office: "Back office",
};

const ROLE_COLORS: Record<keyof AnalyticsUsers["byRole"], string> = {
  admin: "hsl(142, 52%, 32%)",
  third_party: "hsl(199, 70%, 45%)",
  back_office: "hsl(262, 45%, 48%)",
};

export interface UsersByRoleChartProps {
  byRole: AnalyticsUsers["byRole"];
  className?: string;
}

export function UsersByRoleChart({ byRole, className }: UsersByRoleChartProps) {
  const chartData = (
    Object.entries(byRole) as [keyof AnalyticsUsers["byRole"], number][]
  ).map(([role, count]) => ({
    role,
    label: ROLE_LABELS[role],
    count,
  }));

  const total = chartData.reduce((sum, r) => sum + r.count, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Users by role</CardTitle>
        <p className="text-sm text-muted-foreground">
          Active users in your organization
        </p>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p
            className="flex h-[280px] items-center justify-center text-sm text-muted-foreground"
            role="status"
          >
            No active users recorded.
          </p>
        ) : (
          <div
            className="h-[280px] w-full min-w-0"
            role="img"
            aria-label={`Bar chart of users by role: ${chartData.map((r) => `${r.label} ${r.count}`).join(", ")}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  className="stroke-border"
                />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={88}
                  tick={{ fontSize: 11, fill: "hsl(0 0% 45%)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(0 0% 96%)" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(0 0% 90%)",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [value, "Users"]}
                />
                <Bar dataKey="count" name="Users" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.role} fill={ROLE_COLORS[entry.role]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
import type { AnalyticsOverviewData } from "@/lib/types";
import { Button } from "@/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { KpiCard, KpiGridSkeleton } from "@/components/analytics/kpi-card";
import { LineChart, Users, UserCheck, UsersRound, Ticket, Receipt, ArrowRight } from "lucide-react";

import { formatAnalyticsNumber } from "@/lib/analytics/format";

const OVERVIEW_PERIOD = "monthly" as const;

export function AnalyticsOverview() {
  const { hasPermission, isLoading: rbacLoading } = useRbac();
  const canRead = hasPermission(Permission.REPORTS_READ);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsOverviewData | null>(null);

  const loadOverview = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await api.analytics.overview.get({ period: OVERVIEW_PERIOD });
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canRead) loadOverview();
  }, [canRead, loadOverview]);

  if (rbacLoading || !canRead) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <LineChart className="h-5 w-5 text-primary" />
            Overview
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {data
              ? `${data.period.label} · ${data.period.fromDate} — ${data.period.toDate}`
              : "Organization analytics at a glance"}
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0 w-full sm:w-auto">
          <Link href="/dashboard/analytics?period=monthly">
            View full analytics
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {loading && !data ? (
          <KpiGridSkeleton count={5} />
        ) : data ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              title="Users"
              value={formatAnalyticsNumber(data.users.total)}
              subtitle="Active in organization"
              icon={Users}
            />
            <KpiCard
              title="Clients served"
              value={formatAnalyticsNumber(data.clientsServed.uniqueClients)}
              subtitle="Unique clients with redemption"
              icon={UserCheck}
            />
            <KpiCard
              title="People served"
              value={formatAnalyticsNumber(data.peopleServed.totalPeople)}
              subtitle={
                data.peopleServed.totalPeople > 0
                  ? `${formatAnalyticsNumber(data.peopleServed.children)} children · ${formatAnalyticsNumber(data.peopleServed.adults)} adults`
                  : "From redeemed voucher household data"
              }
              icon={UsersRound}
            />
            <KpiCard
              title="Vouchers issued"
              value={formatAnalyticsNumber(data.vouchers.issued)}
              subtitle="In selected period"
              icon={Ticket}
            />
            <KpiCard
              title="Vouchers redeemed"
              value={formatAnalyticsNumber(data.vouchers.redeemed)}
              subtitle="Fulfillment events"
              icon={Receipt}
            />
          </div>
        ) : !error ? (
          <p className="text-sm text-muted-foreground">
            No overview data available.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

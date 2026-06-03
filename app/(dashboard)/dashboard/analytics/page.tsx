"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
import {
  analyticsSelectionToApiParams,
  analyticsSelectionToSearchParams,
  parseAnalyticsSelectionFromSearchParams,
  type AnalyticsPeriodSelection,
} from "@/lib/analytics/period";
import {
  formatAnalyticsNumber,
  formatAnalyticsPeriodRange,
} from "@/lib/analytics/format";
import { isAnalyticsDataEmpty } from "@/lib/analytics/empty-state";
import type { AnalyticsData } from "@/lib/types";
import { Button } from "@/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { Loading } from "@/components/ui/loading";
import { KpiCard, KpiGridSkeleton } from "@/components/analytics/kpi-card";
import {
  PeriodSelector,
  PeriodSelectorSkeleton,
} from "@/components/analytics/period-selector";
import { ChartCardSkeleton } from "@/components/analytics/chart-skeleton";
import { VoucherTrendChart } from "@/components/analytics/voucher-trend-chart";
import { UsersByRoleChart } from "@/components/analytics/users-by-role-chart";
import {
  Users,
  UserCheck,
  Ticket,
  Receipt,
  Percent,
  Download,
  BarChart3,
} from "lucide-react";

function selectionFromSearchParams(
  params: URLSearchParams
): AnalyticsPeriodSelection {
  return parseAnalyticsSelectionFromSearchParams(params);
}

function redemptionRateLabel(issued: number, redemptions: number): string {
  if (issued <= 0) return "—";
  const pct = Math.min(100, Math.round((redemptions / issued) * 100));
  return `${pct}%`;
}

function usersRoleSubtitle(byRole: AnalyticsData["users"]["byRole"]): string {
  const parts: string[] = [];
  if (byRole.admin > 0) {
    parts.push(`${formatAnalyticsNumber(byRole.admin)} admin`);
  }
  if (byRole.third_party > 0) {
    parts.push(`${formatAnalyticsNumber(byRole.third_party)} third party`);
  }
  if (byRole.back_office > 0) {
    parts.push(`${formatAnalyticsNumber(byRole.back_office)} back office`);
  }
  return parts.length ? parts.join(" · ") : "No active users by role";
}

function AnalyticsEmptyState({ label }: { label: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <BarChart3 className="h-10 w-10 text-muted-foreground/60" aria-hidden />
        <div className="space-y-1 max-w-md">
          <p className="font-medium text-foreground">No activity in this period</p>
          <p className="text-sm text-muted-foreground">
            There are no vouchers issued or redeemed for {label}. Try a longer
            period such as 60 days or all time, or check back after more vouchers
            are issued and fulfilled.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { hasPermission, isLoading: rbacLoading } = useRbac();
  const canRead = hasPermission(Permission.REPORTS_READ);

  const [selection, setSelection] = useState<AnalyticsPeriodSelection>(() =>
    selectionFromSearchParams(searchParams)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);

  const updateSelectionInUrl = useCallback(
    (next: AnalyticsPeriodSelection) => {
      const params = analyticsSelectionToSearchParams(next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router]
  );

  const handleSelectionChange = useCallback(
    (next: AnalyticsPeriodSelection) => {
      setSelection(next);
      updateSelectionInUrl(next);
    },
    [updateSelectionInUrl]
  );

  useEffect(() => {
    const fromUrl = selectionFromSearchParams(searchParams);
    setSelection((current) => {
      const currentParams = analyticsSelectionToSearchParams(current).toString();
      const urlParams = analyticsSelectionToSearchParams(fromUrl).toString();
      if (urlParams !== currentParams) return fromUrl;
      return current;
    });
  }, [searchParams]);

  const loadAnalytics = useCallback(async (next: AnalyticsPeriodSelection) => {
    setError(null);
    setLoading(true);
    try {
      const result = await api.analytics.get(analyticsSelectionToApiParams(next));
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canRead) loadAnalytics(selection);
  }, [canRead, selection, loadAnalytics]);

  const csvUrl = api.analytics.getCsvUrl(analyticsSelectionToApiParams(selection));
  const showContentSkeleton = loading;
  const isEmpty = data != null && !loading && isAnalyticsDataEmpty(data);

  if (rbacLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
          Analytics
        </h1>
        <Loading />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
          Analytics
        </h1>
        <p className="text-destructive">
          You do not have permission to view analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organization performance and voucher insights
          </p>
          {data && !loading && (
            <p className="mt-1 text-sm font-medium text-foreground">
              {data.period.label} ·{" "}
              {formatAnalyticsPeriodRange(
                data.period.fromDate,
                data.period.toDate
              )}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          asChild
          disabled={loading}
        >
          <a
            href={csvUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </a>
        </Button>
      </div>

      {loading && !data ? (
        <PeriodSelectorSkeleton />
      ) : (
        <PeriodSelector
          value={selection}
          onChange={handleSelectionChange}
          disabled={loading}
        />
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {showContentSkeleton ? (
        <>
          <KpiGridSkeleton count={5} />
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCardSkeleton />
            <ChartCardSkeleton />
          </div>
        </>
      ) : data ? (
        isEmpty ? (
          <AnalyticsEmptyState label={data.period.label.toLowerCase()} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard
                title="Total users"
                value={formatAnalyticsNumber(data.users.active)}
                subtitle={usersRoleSubtitle(data.users.byRole)}
                icon={Users}
              />
              <KpiCard
                title="Clients served"
                value={formatAnalyticsNumber(data.clientsServed.uniqueClients)}
                subtitle={`${formatAnalyticsNumber(data.clientsServed.redemptions)} redemption events`}
                icon={UserCheck}
              />
              <KpiCard
                title="Vouchers issued"
                value={formatAnalyticsNumber(data.vouchers.issued)}
                subtitle="By issue date in period"
                icon={Ticket}
              />
              <KpiCard
                title="Vouchers redeemed"
                value={formatAnalyticsNumber(data.clientsServed.redemptions)}
                subtitle="Fulfillment events in period"
                icon={Receipt}
              />
              <KpiCard
                title="Redemption rate"
                value={redemptionRateLabel(
                  data.vouchers.issued,
                  data.clientsServed.redemptions
                )}
                subtitle="Redemptions ÷ vouchers issued"
                icon={Percent}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <VoucherTrendChart data={data.timeSeries} />
              <UsersByRoleChart byRole={data.users.byRole} />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By agency</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Issued and redeemed vouchers by referring agency
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {data.byAgency.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">
                      No agency activity in this period.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agency</TableHead>
                          <TableHead className="text-right">Issued</TableHead>
                          <TableHead className="text-right">Redeemed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.byAgency.map((r) => (
                          <TableRow key={r.agencyId}>
                            <TableCell>{r.agencyName}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatAnalyticsNumber(r.issued)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatAnalyticsNumber(r.redeemed)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By food bank centre</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Redemptions at each centre
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {data.byCenter.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">
                      No redemptions in this period.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Centre</TableHead>
                          <TableHead className="text-right">Redeemed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.byCenter.map((r) => (
                          <TableRow key={r.centerId}>
                            <TableCell>{r.centerName}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatAnalyticsNumber(r.redeemed)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top income sources</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Household income sources on issued vouchers
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {data.topIncomeSources.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    No income source data in this period.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Income source</TableHead>
                        <TableHead className="text-right">Vouchers</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topIncomeSources.map((r, i) => (
                        <TableRow key={`${r.incomeSource}-${i}`}>
                          <TableCell>{r.incomeSource}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatAnalyticsNumber(r.count)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )
      ) : !error ? (
        <p className="text-sm text-muted-foreground">
          No analytics data available.
        </p>
      ) : null}
    </div>
  );
}

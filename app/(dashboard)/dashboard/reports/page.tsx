"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
import type { ReportData } from "@/lib/types";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
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

const defaultTo = new Date();
const defaultFrom = new Date(defaultTo.getTime() - 30 * 24 * 60 * 60 * 1000);

export default function ReportsPage() {
  const { hasPermission, isLoading: rbacLoading } = useRbac();
  const canReadReports = hasPermission(Permission.REPORTS_READ);

  const [fromDate, setFromDate] = useState(
    defaultFrom.toISOString().slice(0, 10)
  );
  const [toDate, setToDate] = useState(defaultTo.toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReportData | null>(null);

  const loadReport = useCallback(async () => {
    const from = fromDate?.trim() || undefined;
    const to = toDate?.trim() || undefined;
    if (from && to && new Date(from) > new Date(to)) {
      setError("From date must be on or before To date.");
      setData(null);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await api.reports.get({
        fromDate: from,
        toDate: to,
      });
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    if (canReadReports) loadReport();
  }, [canReadReports, loadReport]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadReport();
  }

  const csvUrl = api.reports.getCsvUrl({ fromDate, toDate });

  if (rbacLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Reports</h1>
        <Loading />
      </div>
    );
  }

  if (!canReadReports) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Reports</h1>
        <p className="text-destructive">You do not have permission to view reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Reports</h1>

      <Card>
        <CardHeader>
          <CardTitle>Date range</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose a date range for voucher statistics (by issue date).
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromDate">From</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toDate">To</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Loading…" : "Update report"}
            </Button>
            <Button
              type="button"
              variant="outline"
              asChild
              disabled={!fromDate || !toDate || loading}
            >
              <a
                href={csvUrl}
                download={`report-${fromDate}-${toDate}.csv`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Export CSV
              </a>
            </Button>
          </form>
          {error && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <p className="text-sm text-muted-foreground">
                {data.fromDate} — {data.toDate}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Issued
                  </p>
                  <p className="text-2xl font-semibold">{data.issuedCount}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Redeemed
                  </p>
                  <p className="text-2xl font-semibold">{data.redeemedCount}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Expired
                  </p>
                  <p className="text-2xl font-semibold">{data.expiredCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By agency</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.byAgency.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No data in this range.
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
                        <TableCell className="text-right">{r.issued}</TableCell>
                        <TableCell className="text-right">{r.redeemed}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By food bank centre (redemptions)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.byCenter.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No redemptions in this range.
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
                        <TableCell className="text-right">{r.redeemed}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top income sources</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.topIncomeSources.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No data in this range.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Income source</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topIncomeSources.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.incomeSource}</TableCell>
                        <TableCell className="text-right">{r.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

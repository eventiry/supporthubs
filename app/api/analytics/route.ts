import { NextRequest, NextResponse } from "next/server";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { Permission } from "@/lib/rbac/permissions";
import { db } from "@/lib/db";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";
import {
  InvalidAnalyticsPeriodError,
  isAnalyticsPeriodPreset,
  resolveAnalyticsPeriod,
  resolveCustomAnalyticsPeriod,
} from "@/lib/analytics/period";
import { getOrganizationAnalytics } from "@/lib/analytics/queries";
import type { AnalyticsData } from "@/lib/types";

function escapeCsvCell(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function buildAnalyticsCsv(data: AnalyticsData): string {
  const { period } = data;
  const rows: string[][] = [
    ["Analytics", "From", "To", "Period"],
    ["", period.fromDate, period.toDate, period.label],
    [],
    ["Users (active)", String(data.users.active)],
    ["Users — admin", String(data.users.byRole.admin)],
    ["Users — third_party", String(data.users.byRole.third_party)],
    ["Users — back_office", String(data.users.byRole.back_office)],
    [],
    ["Clients served (unique)", String(data.clientsServed.uniqueClients)],
    ["Redemptions (events)", String(data.clientsServed.redemptions)],
    [],
    ["People served (total)", String(data.peopleServed.totalPeople)],
    ["People served — children (0-17)", String(data.peopleServed.children)],
    ["People served — adults (18+)", String(data.peopleServed.adults)],
    [
      "Redemptions with household data",
      String(data.peopleServed.redemptionsWithData),
    ],
    [
      "Redemptions without household data",
      String(data.peopleServed.redemptionsWithoutData),
    ],
    ["Age band", "People"],
    ...data.peopleServed.byAgeBand.map((r) => [
      `${r.band} years`,
      String(r.count),
    ]),
    [],
    ["Food distributed (kg)", String(data.foodDistributed.totalKg)],
    [
      "Redemptions with weight recorded",
      String(data.foodDistributed.redemptionsWithWeight),
    ],
    [
      "Redemptions without weight recorded",
      String(data.foodDistributed.redemptionsWithoutWeight),
    ],
    [],
    ["Vouchers issued (in period)", String(data.vouchers.issued)],
    ["Vouchers status — redeemed", String(data.vouchers.redeemed)],
    ["Vouchers status — expired", String(data.vouchers.expired)],
    ["Vouchers status — unfulfilled", String(data.vouchers.unfulfilled)],
    [],
    ["Date", "Issued", "Redeemed"],
    ...data.timeSeries.map((p) => [
      p.date,
      String(p.issued),
      String(p.redeemed),
    ]),
    [],
    ["Agency", "Issued", "Redeemed", "People served", "Food distributed (kg)"],
    ...data.byAgency.map((r) => [
      r.agencyName,
      String(r.issued),
      String(r.redeemed),
      String(r.peopleServed),
      String(r.weightKg),
    ]),
    [],
    ["Center", "Redeemed", "People served", "Food distributed (kg)"],
    ...data.byCenter.map((r) => [
      r.centerName,
      String(r.redeemed),
      String(r.peopleServed),
      String(r.weightKg),
    ]),
    [],
    ["Income Source", "Vouchers", "People served"],
    ...data.topIncomeSources.map((r) => [
      r.incomeSource,
      String(r.count),
      String(r.peopleServed),
    ]),
  ];
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

/**
 * GET /api/analytics
 * Query: period? (daily|weekly|monthly|60d|yearly|all), fromDate?, toDate?, format?=json|csv
 * Custom range: fromDate + toDate (period optional).
 * Requires REPORTS_READ. Scoped to current tenant organization.
 */
export async function GET(req: NextRequest) {
  const out = await getSessionUserAndTenant(req);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;

  if (!getPermissionsForRole(user.role).includes(Permission.REPORTS_READ)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const periodParam = searchParams.get("period")?.trim();
  const fromParam = searchParams.get("fromDate")?.trim();
  const toParam = searchParams.get("toDate")?.trim();
  const format = searchParams.get("format") === "csv" ? "csv" : "json";

  let resolved;
  try {
    if (fromParam && toParam) {
      resolved = resolveCustomAnalyticsPeriod(
        new Date(fromParam),
        new Date(toParam)
      );
    } else if (periodParam && isAnalyticsPeriodPreset(periodParam)) {
      const org = await db.organization.findUnique({
        where: { id: tenant.organizationId },
        select: { createdAt: true },
      });
      resolved = resolveAnalyticsPeriod(periodParam, {
        orgCreatedAt: org?.createdAt,
      });
    } else if (periodParam) {
      return NextResponse.json(
        {
          message: `Invalid period "${periodParam}". Allowed: daily, weekly, monthly, 60d, yearly, all`,
        },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        {
          message:
            "Provide period (daily|weekly|monthly|60d|yearly|all) or both fromDate and toDate",
        },
        { status: 400 }
      );
    }
  } catch (err) {
    if (err instanceof InvalidAnalyticsPeriodError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    throw err;
  }

  const analytics = await getOrganizationAnalytics(
    tenant.organizationId,
    resolved.fromDate,
    resolved.toDate
  );

  const data: AnalyticsData = {
    period: {
      period: resolved.period,
      fromDate: resolved.fromDateStr,
      toDate: resolved.toDateStr,
      label: resolved.label,
    },
    users: analytics.users,
    clientsServed: analytics.clientsServed,
    peopleServed: analytics.peopleServed,
    foodDistributed: analytics.foodDistributed,
    vouchers: analytics.vouchers,
    timeSeries: analytics.timeSeries,
    byAgency: analytics.byAgency,
    byCenter: analytics.byCenter,
    topIncomeSources: analytics.topIncomeSources,
  };

  if (format === "csv") {
    const csv = buildAnalyticsCsv(data);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="analytics-${resolved.fromDateStr}-${resolved.toDateStr}.csv"`,
      },
    });
  }

  return NextResponse.json(data);
}

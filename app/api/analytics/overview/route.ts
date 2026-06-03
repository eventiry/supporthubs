import { NextRequest, NextResponse } from "next/server";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { Permission } from "@/lib/rbac/permissions";
import { db } from "@/lib/db";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";
import {
  InvalidAnalyticsPeriodError,
  isAnalyticsPeriodPreset,
  resolveAnalyticsPeriod,
} from "@/lib/analytics/period";
import { getOrganizationAnalyticsOverview } from "@/lib/analytics/queries";
import type { AnalyticsOverviewData, AnalyticsPeriodPreset } from "@/lib/types";

const DEFAULT_PERIOD: AnalyticsPeriodPreset = "monthly";

/**
 * GET /api/analytics/overview
 * Query: period? (default monthly) — daily|weekly|monthly|60d|yearly|all
 * Lightweight KPIs for dashboard. Requires REPORTS_READ.
 */
export async function GET(req: NextRequest) {
  const out = await getSessionUserAndTenant(req);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;

  if (!getPermissionsForRole(user.role).includes(Permission.REPORTS_READ)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const periodParam =
    req.nextUrl.searchParams.get("period")?.trim() || DEFAULT_PERIOD;

  if (!isAnalyticsPeriodPreset(periodParam)) {
    return NextResponse.json(
      {
        message: `Invalid period "${periodParam}". Allowed: daily, weekly, monthly, 60d, yearly, all`,
      },
      { status: 400 }
    );
  }

  let resolved;
  try {
    const org = await db.organization.findUnique({
      where: { id: tenant.organizationId },
      select: { createdAt: true },
    });
    resolved = resolveAnalyticsPeriod(periodParam, {
      orgCreatedAt: org?.createdAt,
    });
  } catch (err) {
    if (err instanceof InvalidAnalyticsPeriodError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    throw err;
  }

  const overview = await getOrganizationAnalyticsOverview(
    tenant.organizationId,
    resolved.fromDate,
    resolved.toDate
  );

  const data: AnalyticsOverviewData = {
    period: {
      period: resolved.period,
      fromDate: resolved.fromDateStr,
      toDate: resolved.toDateStr,
      label: resolved.label,
    },
    users: overview.users,
    clientsServed: overview.clientsServed,
    vouchers: overview.vouchers,
  };

  return NextResponse.json(data);
}

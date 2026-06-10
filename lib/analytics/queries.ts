import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { aggregatePeopleFromRedemptions } from "@/lib/analytics/household";
import { toDateOnlyUtc } from "@/lib/analytics/period";
import type {
  AnalyticsPeopleServed,
  ReportAgencyRow,
  ReportCenterRow,
  ReportIncomeSourceRow,
} from "@/lib/types";

export interface AnalyticsUsersResult {
  total: number;
  active: number;
  byRole: { admin: number; third_party: number; back_office: number };
}

export interface AnalyticsClientsServedResult {
  uniqueClients: number;
  redemptions: number;
}

export interface AnalyticsVouchersResult {
  issued: number;
  redeemed: number;
  expired: number;
  unfulfilled: number;
}

export interface AnalyticsTimeSeriesPoint {
  date: string;
  issued: number;
  redeemed: number;
}

export interface OrganizationAnalyticsResult {
  users: AnalyticsUsersResult;
  clientsServed: AnalyticsClientsServedResult;
  peopleServed: AnalyticsPeopleServed;
  vouchers: AnalyticsVouchersResult;
  timeSeries: AnalyticsTimeSeriesPoint[];
  byAgency: ReportAgencyRow[];
  byCenter: ReportCenterRow[];
  topIncomeSources: ReportIncomeSourceRow[];
}

const redemptionWhere = (
  organizationId: string,
  fromDate: Date,
  toDate: Date
): Prisma.RedemptionWhereInput => ({
  redeemedAt: { gte: fromDate, lte: toDate },
  voucher: { is: { organizationId } },
});

const voucherIssueWhere = (
  organizationId: string,
  fromDate: Date,
  toDate: Date
): Prisma.VoucherWhereInput => ({
  organizationId,
  issueDate: { gte: fromDate, lte: toDate },
});

function emptyByRole(): AnalyticsUsersResult["byRole"] {
  return { admin: 0, third_party: 0, back_office: 0 };
}

async function getUsersAnalytics(
  organizationId: string
): Promise<AnalyticsUsersResult> {
  const roleGroups = await db.user.groupBy({
    by: ["role"],
    where: {
      organizationId,
      status: "ACTIVE",
      role: { in: ["admin", "third_party", "back_office"] },
    },
    _count: { _all: true },
  });

  const byRole = emptyByRole();
  let active = 0;
  for (const row of roleGroups) {
    const count = row._count._all;
    active += count;
    if (row.role === "admin") byRole.admin = count;
    else if (row.role === "third_party") byRole.third_party = count;
    else if (row.role === "back_office") byRole.back_office = count;
  }

  return { total: active, active, byRole };
}

async function getClientsServedAnalytics(
  organizationId: string,
  fromDate: Date,
  toDate: Date
): Promise<AnalyticsClientsServedResult> {
  const where = redemptionWhere(organizationId, fromDate, toDate);

  const [redemptions, redemptionRows] = await Promise.all([
    db.redemption.count({ where }),
    db.redemption.findMany({
      where,
      select: { voucher: { select: { clientId: true } } },
    }),
  ]);

  const uniqueClients = new Set(
    redemptionRows.map((r) => r.voucher.clientId)
  ).size;

  return { uniqueClients, redemptions };
}

async function getPeopleServedAnalytics(
  organizationId: string,
  fromDate: Date,
  toDate: Date
): Promise<AnalyticsPeopleServed> {
  const redemptions = await db.redemption.findMany({
    where: redemptionWhere(organizationId, fromDate, toDate),
    select: {
      voucher: {
        select: {
          referralDetails: { select: { householdByAge: true } },
        },
      },
    },
  });

  const households = redemptions.map(
    (r) => r.voucher.referralDetails?.householdByAge ?? null
  );

  return aggregatePeopleFromRedemptions(households);
}

async function getVouchersAnalytics(
  organizationId: string,
  fromDate: Date,
  toDate: Date
): Promise<AnalyticsVouchersResult> {
  const where = voucherIssueWhere(organizationId, fromDate, toDate);

  const statusGroups = await db.voucher.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });

  let issued = 0;
  let redeemed = 0;
  let expired = 0;
  let unfulfilled = 0;

  for (const row of statusGroups) {
    const count = row._count._all;
    issued += count;
    if (row.status === "redeemed") redeemed += count;
    else if (row.status === "expired") expired += count;
    else if (row.status === "unfulfilled") unfulfilled += count;
  }

  return { issued, redeemed, expired, unfulfilled };
}

type TimeSeriesBucket = "day" | "week" | "month";

function chooseTimeSeriesBucket(fromDate: Date, toDate: Date): TimeSeriesBucket {
  const ms = toDate.getTime() - fromDate.getTime();
  const days = ms / (24 * 60 * 60 * 1000) + 1;
  if (days <= 90) return "day";
  if (days <= 365) return "week";
  return "month";
}

function startOfUtcWeekFromDate(d: Date): Date {
  const day = d.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  x.setUTCDate(x.getUTCDate() - daysSinceMonday);
  return x;
}

function bucketKey(date: Date, bucket: TimeSeriesBucket): string {
  if (bucket === "day") {
    return toDateOnlyUtc(date);
  }
  if (bucket === "week") {
    return toDateOnlyUtc(startOfUtcWeekFromDate(date));
  }
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function enumerateBucketKeys(
  fromDate: Date,
  toDate: Date,
  bucket: TimeSeriesBucket
): string[] {
  const keys: string[] = [];
  const cursor = new Date(fromDate);
  cursor.setUTCHours(0, 0, 0, 0);

  if (bucket === "day") {
    while (cursor.getTime() <= toDate.getTime()) {
      keys.push(toDateOnlyUtc(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return keys;
  }

  if (bucket === "week") {
    let weekStart = startOfUtcWeekFromDate(fromDate);
    while (weekStart.getTime() <= toDate.getTime()) {
      keys.push(toDateOnlyUtc(weekStart));
      weekStart = new Date(weekStart);
      weekStart.setUTCDate(weekStart.getUTCDate() + 7);
    }
    return keys;
  }

  const monthCursor = new Date(
    Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), 1)
  );
  const endMonth = new Date(
    Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), 1)
  );
  while (monthCursor.getTime() <= endMonth.getTime()) {
    keys.push(
      `${monthCursor.getUTCFullYear()}-${String(monthCursor.getUTCMonth() + 1).padStart(2, "0")}-01`
    );
    monthCursor.setUTCMonth(monthCursor.getUTCMonth() + 1);
  }
  return keys;
}

async function getTimeSeriesAnalytics(
  organizationId: string,
  fromDate: Date,
  toDate: Date
): Promise<AnalyticsTimeSeriesPoint[]> {
  const bucket = chooseTimeSeriesBucket(fromDate, toDate);
  const keys = enumerateBucketKeys(fromDate, toDate, bucket);
  const issuedMap = new Map<string, number>(keys.map((k) => [k, 0]));
  const redeemedMap = new Map<string, number>(keys.map((k) => [k, 0]));

  const [issuedVouchers, redemptions] = await Promise.all([
    db.voucher.findMany({
      where: voucherIssueWhere(organizationId, fromDate, toDate),
      select: { issueDate: true },
    }),
    db.redemption.findMany({
      where: redemptionWhere(organizationId, fromDate, toDate),
      select: { redeemedAt: true },
    }),
  ]);

  for (const v of issuedVouchers) {
    const key = bucketKey(v.issueDate, bucket);
    if (issuedMap.has(key)) {
      issuedMap.set(key, (issuedMap.get(key) ?? 0) + 1);
    }
  }

  for (const r of redemptions) {
    const key = bucketKey(r.redeemedAt, bucket);
    if (redeemedMap.has(key)) {
      redeemedMap.set(key, (redeemedMap.get(key) ?? 0) + 1);
    }
  }

  return keys.map((date) => ({
    date,
    issued: issuedMap.get(date) ?? 0,
    redeemed: redeemedMap.get(date) ?? 0,
  }));
}

async function getByAgencyAnalytics(
  organizationId: string,
  fromDate: Date,
  toDate: Date
): Promise<ReportAgencyRow[]> {
  const [vouchers, agencies] = await Promise.all([
    db.voucher.findMany({
      where: voucherIssueWhere(organizationId, fromDate, toDate),
      select: { agencyId: true, status: true },
    }),
    db.agency.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    }),
  ]);

  const agencyNameById = new Map(agencies.map((a) => [a.id, a.name]));
  const byAgencyMap = new Map<
    string,
    { agencyName: string; issued: number; redeemed: number }
  >();

  for (const v of vouchers) {
    if (!byAgencyMap.has(v.agencyId)) {
      byAgencyMap.set(v.agencyId, {
        agencyName: agencyNameById.get(v.agencyId) ?? "Unknown",
        issued: 0,
        redeemed: 0,
      });
    }
    const row = byAgencyMap.get(v.agencyId)!;
    row.issued += 1;
    if (v.status === "redeemed") row.redeemed += 1;
  }

  return Array.from(byAgencyMap.entries())
    .filter(([, row]) => row.issued > 0 || row.redeemed > 0)
    .map(([agencyId, row]) => ({
      agencyId,
      agencyName: row.agencyName,
      issued: row.issued,
      redeemed: row.redeemed,
    }))
    .sort((a, b) => b.issued + b.redeemed - (a.issued + a.redeemed));
}

async function getByCenterAnalytics(
  organizationId: string,
  fromDate: Date,
  toDate: Date
): Promise<ReportCenterRow[]> {
  const redemptions = await db.redemption.findMany({
    where: redemptionWhere(organizationId, fromDate, toDate),
    select: { centerId: true },
  });

  if (redemptions.length === 0) return [];

  const centerIds = [...new Set(redemptions.map((r) => r.centerId))];
  const centers = await db.foodBankCenter.findMany({
    where: { organizationId, id: { in: centerIds } },
    select: { id: true, name: true },
  });
  const centerNameById = new Map(centers.map((c) => [c.id, c.name]));

  const byCenterMap = new Map<string, number>();
  for (const r of redemptions) {
    byCenterMap.set(r.centerId, (byCenterMap.get(r.centerId) ?? 0) + 1);
  }

  return Array.from(byCenterMap.entries())
    .map(([centerId, redeemed]) => ({
      centerId,
      centerName: centerNameById.get(centerId) ?? "Unknown",
      redeemed,
    }))
    .sort((a, b) => b.redeemed - a.redeemed);
}

async function getTopIncomeSourcesAnalytics(
  organizationId: string,
  fromDate: Date,
  toDate: Date
): Promise<ReportIncomeSourceRow[]> {
  const vouchers = await db.voucher.findMany({
    where: voucherIssueWhere(organizationId, fromDate, toDate),
    select: {
      referralDetails: { select: { incomeSource: true } },
    },
  });

  const incomeSourceCounts = new Map<string, number>();
  for (const v of vouchers) {
    const key = v.referralDetails?.incomeSource?.trim() || "(Not specified)";
    incomeSourceCounts.set(key, (incomeSourceCounts.get(key) ?? 0) + 1);
  }

  return Array.from(incomeSourceCounts.entries())
    .map(([incomeSource, count]) => ({ incomeSource, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

/**
 * Organization-scoped analytics for a UTC-inclusive date range.
 */
export async function getOrganizationAnalytics(
  organizationId: string,
  fromDate: Date,
  toDate: Date
): Promise<OrganizationAnalyticsResult> {
  const [
    users,
    clientsServed,
    peopleServed,
    vouchers,
    timeSeries,
    byAgency,
    byCenter,
    topIncomeSources,
  ] = await Promise.all([
    getUsersAnalytics(organizationId),
    getClientsServedAnalytics(organizationId, fromDate, toDate),
    getPeopleServedAnalytics(organizationId, fromDate, toDate),
    getVouchersAnalytics(organizationId, fromDate, toDate),
    getTimeSeriesAnalytics(organizationId, fromDate, toDate),
    getByAgencyAnalytics(organizationId, fromDate, toDate),
    getByCenterAnalytics(organizationId, fromDate, toDate),
    getTopIncomeSourcesAnalytics(organizationId, fromDate, toDate),
  ]);

  return {
    users,
    clientsServed,
    peopleServed,
    vouchers,
    timeSeries,
    byAgency,
    byCenter,
    topIncomeSources,
  };
}

export interface OrganizationAnalyticsOverviewResult {
  users: { total: number };
  clientsServed: { uniqueClients: number };
  peopleServed: { totalPeople: number; children: number; adults: number };
  vouchers: { issued: number; redeemed: number };
}

/**
 * Lightweight aggregates for dashboard overview (no time series or breakdown tables).
 */
export async function getOrganizationAnalyticsOverview(
  organizationId: string,
  fromDate: Date,
  toDate: Date
): Promise<OrganizationAnalyticsOverviewResult> {
  const [users, clientsServed, peopleServed, vouchers] = await Promise.all([
    getUsersAnalytics(organizationId),
    getClientsServedAnalytics(organizationId, fromDate, toDate),
    getPeopleServedAnalytics(organizationId, fromDate, toDate),
    getVouchersAnalytics(organizationId, fromDate, toDate),
  ]);

  return {
    users: { total: users.active },
    clientsServed: { uniqueClients: clientsServed.uniqueClients },
    peopleServed: {
      totalPeople: peopleServed.totalPeople,
      children: peopleServed.children,
      adults: peopleServed.adults,
    },
    vouchers: {
      issued: vouchers.issued,
      redeemed: clientsServed.redemptions,
    },
  };
}

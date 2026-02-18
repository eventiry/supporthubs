import { NextRequest, NextResponse } from "next/server";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { Permission } from "@/lib/rbac/permissions";
import { db } from "@/lib/db";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * GET /api/reports
 * Query: fromDate?, toDate?, format?=json|csv
 * Aggregates: issued vs redeemed vs expired, by agency, by center, top income sources. Scoped to current tenant org.
 * Requires REPORTS_READ.
 */
export async function GET(req: NextRequest) {
  const out = await getSessionUserAndTenant(req);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  if (!getPermissionsForRole(user.role).includes(Permission.REPORTS_READ)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("fromDate")?.trim();
  const toParam = searchParams.get("toDate")?.trim();
  const format = searchParams.get("format") === "csv" ? "csv" : "json";

  const toDateRaw = toParam ? new Date(toParam) : new Date();
  const fromDateRaw = fromParam
    ? new Date(fromParam)
    : new Date(toDateRaw.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(fromDateRaw.getTime()) || Number.isNaN(toDateRaw.getTime())) {
    return NextResponse.json(
      { message: "Invalid fromDate or toDate" },
      { status: 400 }
    );
  }
  if (fromDateRaw.getTime() > toDateRaw.getTime()) {
    return NextResponse.json(
      { message: "From date must be on or before to date" },
      { status: 400 }
    );
  }

  const fromDate = new Date(fromDateRaw);
  fromDate.setUTCHours(0, 0, 0, 0);
  const toDate = new Date(toDateRaw);
  toDate.setUTCHours(23, 59, 59, 999);

  const fromStr = toDateOnly(fromDate);
  const toStr = toDateOnly(toDate);

  const [vouchers, redemptions, agencies] = await Promise.all([
    db.voucher.findMany({
      where: {
        organizationId: tenant.organizationId,
        issueDate: { gte: fromDate, lte: toDate },
      },
      select: {
        id: true,
        status: true,
        agencyId: true,
        referralDetails: { select: { incomeSource: true } },
      },
    }),
    db.redemption.findMany({
      where: {
        voucher: { is: { organizationId: tenant.organizationId } },
        redeemedAt: { gte: fromDate, lte: toDate },
      },
      select: {
        voucherId: true,
        centerId: true,
      },
    }),
    db.agency.findMany({
      where: { organizationId: tenant.organizationId },
      select: { id: true, name: true },
    }),
  ]);

  const issuedCount = vouchers.filter((v) => v.status === "issued").length;
  const redeemedCount = vouchers.filter((v) => v.status === "redeemed").length;
  const expiredCount = vouchers.filter((v) => v.status === "expired").length;

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
  const byAgency = Array.from(byAgencyMap.entries())
    .filter(([, row]) => row.issued > 0 || row.redeemed > 0)
    .map(([agencyId, row]) => ({
      agencyId,
      agencyName: row.agencyName,
      issued: row.issued,
      redeemed: row.redeemed,
    }))
    .sort((a, b) => b.issued + b.redeemed - (a.issued + a.redeemed));

  const centerIds = new Set(redemptions.map((r) => r.centerId));
  const centers = await db.foodBankCenter.findMany({
    where: {
      organizationId: tenant.organizationId,
      id: { in: Array.from(centerIds) },
    },
    select: { id: true, name: true },
  });
  const centerNameById = new Map(centers.map((c) => [c.id, c.name]));
  const byCenterMap = new Map<string, number>();
  for (const r of redemptions) {
    byCenterMap.set(r.centerId, (byCenterMap.get(r.centerId) ?? 0) + 1);
  }
  const byCenter = Array.from(byCenterMap.entries()).map(
    ([centerId, redeemed]) => ({
      centerId,
      centerName: centerNameById.get(centerId) ?? "Unknown",
      redeemed,
    })
  ).sort((a, b) => b.redeemed - a.redeemed);

  const incomeSourceCounts = new Map<string, number>();
  for (const v of vouchers) {
    const key =
      (v.referralDetails?.incomeSource?.trim()) || "(Not specified)";
    incomeSourceCounts.set(key, (incomeSourceCounts.get(key) ?? 0) + 1);
  }
  const topIncomeSources = Array.from(incomeSourceCounts.entries())
    .map(([incomeSource, count]) => ({ incomeSource, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const data = {
    issuedCount,
    redeemedCount,
    expiredCount,
    fromDate: fromStr,
    toDate: toStr,
    byAgency,
    byCenter,
    topIncomeSources,
  };

  if (format === "csv") {
    const rows: string[][] = [
      ["Report", "From", "To"],
      ["", fromStr, toStr],
      ["Issued", String(data.issuedCount)],
      ["Redeemed", String(data.redeemedCount)],
      ["Expired", String(data.expiredCount)],
      [],
      ["Agency", "Issued", "Redeemed"],
      ...data.byAgency.map((r) => [
        r.agencyName,
        String(r.issued),
        String(r.redeemed),
      ]),
      [],
      ["Center", "Redeemed"],
      ...data.byCenter.map((r) => [r.centerName, String(r.redeemed)]),
      [],
      ["Income Source", "Count"],
      ...data.topIncomeSources.map((r) => [r.incomeSource, String(r.count)]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="report-${fromStr}-${toStr}.csv"`,
      },
    });
  }

  return NextResponse.json(data);
}

import { NextResponse } from "next/server";
import { db, setPlatformRlsContext } from "@/lib/db";
import { SUBSCRIPTION_ENABLED } from "@/lib/config";

/**
 * GET /api/plans — list active subscription plans (public). Returns empty when SUBSCRIPTION_ENABLED is false.
 */
export async function GET() {
  if (!SUBSCRIPTION_ENABLED) {
    return NextResponse.json([]);
  }

  await setPlatformRlsContext();
  const plans = await db.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: [{ tier: "asc" }, { name: "asc" }],
  });

  const list = plans.map((p) => {
    const limits = (p.limits as Record<string, unknown>) ?? {};
    const features = Array.isArray(p.features)
      ? (p.features as string[])
      : typeof p.features === "object" && p.features !== null && "length" in p.features
        ? Array.from(p.features as unknown as string[])
        : [];

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      tier: p.tier,
      description: p.description ?? null,
      features,
      limits: {
        maxUsers: typeof limits.maxUsers === "number" ? limits.maxUsers : undefined,
        maxAgencies: typeof limits.maxAgencies === "number" ? limits.maxAgencies : undefined,
        maxVouchersPerMonth:
          typeof limits.maxVouchersPerMonth === "number" ? limits.maxVouchersPerMonth : undefined,
      },
      priceMonthly: p.priceMonthly != null ? Number(p.priceMonthly) : null,
      priceYearly: p.priceYearly != null ? Number(p.priceYearly) : null,
    };
  });

  return NextResponse.json(list);
}

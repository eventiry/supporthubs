import { NextRequest, NextResponse } from "next/server";
import { db, Prisma } from "@/lib/db";
import { getPlatformAdminSession } from "@/lib/api/get-platform-admin-session";
import { getStripe, createProductAndPrices } from "@/lib/stripe";

/**
 * GET /api/platform/plans — list all subscription plans (platform admin only).
 */
export async function GET(_req: NextRequest) {
  const out = await getPlatformAdminSession(_req);
  if (out instanceof NextResponse) return out;

  const plans = await db.subscriptionPlan.findMany({
    orderBy: [{ tier: "asc" }, { name: "asc" }],
  });

  const list = plans.map((p) => {
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
      limits: p.limits as Record<string, unknown>,
      priceMonthly: p.priceMonthly != null ? Number(p.priceMonthly) : null,
      priceYearly: p.priceYearly != null ? Number(p.priceYearly) : null,
      active: p.active,
      stripePriceId: p.stripePriceId ?? null,
    };
  });

  return NextResponse.json(list);
}

/**
 * POST /api/platform/plans — create subscription plan (platform admin only).
 */
export async function POST(req: NextRequest) {
  const out = await getPlatformAdminSession(req);
  if (out instanceof NextResponse) return out;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const slug = typeof payload.slug === "string" ? payload.slug.trim().toLowerCase() : "";
  const tier = typeof payload.tier === "string" ? payload.tier.trim() : "";

  if (!name || !slug || !tier) {
    return NextResponse.json(
      { message: "name, slug, and tier are required" },
      { status: 400 }
    );
  }

  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug)) {
    return NextResponse.json(
      { message: "Slug must be lowercase letters, numbers, and hyphens only" },
      { status: 400 }
    );
  }

  const limits = payload.limits != null && typeof payload.limits === "object"
    ? (payload.limits as Record<string, unknown>)
    : {};
  const description = typeof payload.description === "string" ? payload.description.trim() || null : null;
  const rawFeatures = payload.features;
  const features =
    Array.isArray(rawFeatures) && rawFeatures.every((f) => typeof f === "string")
      ? (rawFeatures as string[])
      : null;
  const priceMonthly =
    typeof payload.priceMonthly === "number" && Number.isFinite(payload.priceMonthly)
      ? payload.priceMonthly
      : typeof payload.priceMonthly === "string"
        ? parseFloat(payload.priceMonthly)
        : null;
  const priceYearly =
    typeof payload.priceYearly === "number" && Number.isFinite(payload.priceYearly)
      ? payload.priceYearly
      : typeof payload.priceYearly === "string"
        ? parseFloat(payload.priceYearly)
        : null;
  const existing = await db.subscriptionPlan.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ message: "A plan with this slug already exists" }, { status: 409 });
  }

  let stripeProductId: string | null = null;
  let stripePriceId: string | null = null;
  let stripePriceIdYearly: string | null = null;

  const hasPrices = (priceMonthly != null && priceMonthly > 0) || (priceYearly != null && priceYearly > 0);
  if (getStripe() && hasPrices) {
    try {
      const result = await createProductAndPrices(
        name,
        description,
        priceMonthly,
        priceYearly
      );
      stripeProductId = result.productId;
      stripePriceId = result.priceIdMonthly ?? result.priceIdYearly;
      stripePriceIdYearly = result.priceIdYearly;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stripe error";
      return NextResponse.json(
        { message: `Failed to create Stripe product/prices: ${message}` },
        { status: 502 }
      );
    }
  } else {
    const manual = typeof payload.stripePriceId === "string" ? payload.stripePriceId.trim() || null : null;
    if (manual) stripePriceId = manual;
  }

  const plan = await db.subscriptionPlan.create({
    data: {
      name,
      slug,
      tier,
      description,
      features: features ?? undefined,
      limits: limits as Prisma.InputJsonValue,
      priceMonthly: priceMonthly != null ? priceMonthly : undefined,
      priceYearly: priceYearly != null ? priceYearly : undefined,
      stripeProductId: stripeProductId ?? undefined,
      stripePriceId: stripePriceId ?? undefined,
      stripePriceIdYearly: stripePriceIdYearly ?? undefined,
      active: true,
    },
  });

  const featuresList = Array.isArray(plan.features)
    ? (plan.features as string[])
    : [];
  return NextResponse.json({
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    tier: plan.tier,
    description: plan.description ?? null,
    features: featuresList,
    limits: plan.limits as Record<string, unknown>,
    priceMonthly: plan.priceMonthly != null ? Number(plan.priceMonthly) : null,
    priceYearly: plan.priceYearly != null ? Number(plan.priceYearly) : null,
    active: plan.active,
    stripePriceId: plan.stripePriceId ?? null,
    stripePriceIdYearly: plan.stripePriceIdYearly ?? null,
  });
}

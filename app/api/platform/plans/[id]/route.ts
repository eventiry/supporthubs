import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getPlatformAdminSession } from "@/lib/api/get-platform-admin-session";
import { getStripe, createProductAndPrices, createPricesForProduct } from "@/lib/stripe";

/**
 * PATCH /api/platform/plans/[id] — update subscription plan (platform admin only).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await getPlatformAdminSession(req);
  if (out instanceof NextResponse) return out;

  const { id } = await params;
  const existing = await db.subscriptionPlan.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: "Plan not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const data: {
    name?: string;
    slug?: string;
    tier?: string;
    description?: string | null;
    features?: string[] | null;
    limits?: Record<string, unknown>;
    priceMonthly?: number | null;
    priceYearly?: number | null;
    active?: boolean;
    stripeProductId?: string | null;
    stripePriceId?: string | null;
    stripePriceIdYearly?: string | null;
  } = {};

  if (typeof payload.name === "string") data.name = payload.name.trim();
  if (typeof payload.slug === "string") {
    const slug = payload.slug.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug)) {
      return NextResponse.json(
        { message: "Slug must be lowercase letters, numbers, and hyphens only" },
        { status: 400 }
      );
    }
    data.slug = slug;
  }
  if (typeof payload.tier === "string") data.tier = payload.tier.trim();
  if (payload.description !== undefined) {
    data.description = typeof payload.description === "string" ? payload.description.trim() || null : null;
  }
  if (payload.features !== undefined) {
    data.features = Array.isArray(payload.features) && payload.features.every((f: unknown) => typeof f === "string")
      ? (payload.features as string[])
      : null;
  }
  if (payload.limits !== undefined && payload.limits !== null && typeof payload.limits === "object") {
    data.limits = payload.limits as Record<string, unknown>;
  }
  if (payload.priceMonthly !== undefined) {
    const n = typeof payload.priceMonthly === "number" ? payload.priceMonthly : parseFloat(String(payload.priceMonthly));
    data.priceMonthly = Number.isFinite(n) ? n : null;
  }
  if (payload.priceYearly !== undefined) {
    const n = typeof payload.priceYearly === "number" ? payload.priceYearly : parseFloat(String(payload.priceYearly));
    data.priceYearly = Number.isFinite(n) ? n : null;
  }
  if (typeof payload.active === "boolean") data.active = payload.active;

  const newPriceMonthly = data.priceMonthly !== undefined ? data.priceMonthly : (existing.priceMonthly != null ? Number(existing.priceMonthly) : null);
  const newPriceYearly = data.priceYearly !== undefined ? data.priceYearly : (existing.priceYearly != null ? Number(existing.priceYearly) : null);
  const hadPrices = (existing.priceMonthly != null && Number(existing.priceMonthly) > 0) || (existing.priceYearly != null && Number(existing.priceYearly) > 0);
  const hasPricesNow = (newPriceMonthly != null && newPriceMonthly > 0) || (newPriceYearly != null && newPriceYearly > 0);
  const priceChanged =
    (data.priceMonthly !== undefined && Number(existing.priceMonthly) !== data.priceMonthly) ||
    (data.priceYearly !== undefined && Number(existing.priceYearly) !== data.priceYearly);

  if (getStripe() && (priceChanged || (!hadPrices && hasPricesNow))) {
    try {
      const productId = existing.stripeProductId;
      if (productId && hadPrices) {
        const result = await createPricesForProduct(productId, newPriceMonthly, newPriceYearly);
        data.stripePriceId = result.priceIdMonthly ?? result.priceIdYearly ?? existing.stripePriceId ?? undefined;
        data.stripePriceIdYearly = result.priceIdYearly ?? existing.stripePriceIdYearly ?? undefined;
      } else if (hasPricesNow) {
        const result = await createProductAndPrices(
          (data.name ?? existing.name) as string,
          (data.description !== undefined ? data.description : existing.description) as string | null,
          newPriceMonthly,
          newPriceYearly
        );
        data.stripeProductId = result.productId;
        data.stripePriceId = result.priceIdMonthly ?? result.priceIdYearly;
        data.stripePriceIdYearly = result.priceIdYearly;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stripe error";
      return NextResponse.json(
        { message: `Failed to update Stripe prices: ${message}` },
        { status: 502 }
      );
    }
  }
  console.log(data);

  if (data.slug && data.slug !== existing.slug) {
    const conflict = await db.subscriptionPlan.findUnique({ where: { slug: data.slug } });
    if (conflict) {
      return NextResponse.json({ message: "A plan with this slug already exists" }, { status: 409 });
    }
  }

  const updateData: Prisma.SubscriptionPlanUpdateInput = {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.slug !== undefined && { slug: data.slug }),
    ...(data.tier !== undefined && { tier: data.tier }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.features !== undefined && {
      features: data.features === null ? Prisma.JsonNull : (data.features as Prisma.InputJsonValue),
    }),
    ...(data.limits !== undefined && { limits: data.limits as Prisma.InputJsonValue }),
    ...(data.priceMonthly !== undefined && { priceMonthly: data.priceMonthly }),
    ...(data.priceYearly !== undefined && { priceYearly: data.priceYearly }),
    ...(data.active !== undefined && { active: data.active }),
    ...(data.stripeProductId !== undefined && { stripeProductId: data.stripeProductId }),
    ...(data.stripePriceId !== undefined && { stripePriceId: data.stripePriceId }),
    ...(data.stripePriceIdYearly !== undefined && { stripePriceIdYearly: data.stripePriceIdYearly }),
  };

  const plan = await db.subscriptionPlan.update({
    where: { id },
    data: updateData,
  });

  const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];
  return NextResponse.json({
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    tier: plan.tier,
    description: plan.description ?? null,
    features,
    limits: plan.limits as Record<string, unknown>,
    priceMonthly: plan.priceMonthly != null ? Number(plan.priceMonthly) : null,
    priceYearly: plan.priceYearly != null ? Number(plan.priceYearly) : null,
    active: plan.active,
    stripePriceId: plan.stripePriceId ?? null,
    stripePriceIdYearly: plan.stripePriceIdYearly ?? null,
  });
}

/**
 * DELETE /api/platform/plans/[id] — deactivate plan (industry standard: soft delete).
 * Sets active = false so it no longer appears on pricing or for new subscriptions.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await getPlatformAdminSession(_req);
  if (out instanceof NextResponse) return out;

  const { id } = await params;
  const existing = await db.subscriptionPlan.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: "Plan not found" }, { status: 404 });
  }

  await db.subscriptionPlan.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}

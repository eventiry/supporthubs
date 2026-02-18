import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db, setPlatformRlsContext } from "@/lib/db";
import { SUBSCRIPTION_ENABLED, STRIPE_WEBHOOK_SECRET } from "@/lib/config";
import type { SubscriptionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/** Map Stripe subscription status to our SubscriptionStatus enum. */
function mapStripeStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "cancelled":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
      return "cancelled";
    default:
      return "none";
  }
}

/**
 * POST /api/webhooks/stripe
 * Stripe webhook for subscription lifecycle. Verifies signature, records in Subscription model,
 * then syncs denormalized fields to Organization. When SUBSCRIPTION_ENABLED or
 * STRIPE_WEBHOOK_SECRET is unset, returns 200 without processing (avoids retries).
 */
export async function POST(req: NextRequest) {
  if (!SUBSCRIPTION_ENABLED || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await setPlatformRlsContext();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;
      const organizationId =
        (session.client_reference_id as string) ||
        (session.metadata?.organizationId as string);
      const planId = session.metadata?.planId as string | undefined;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
      if (!organizationId || !customerId || !subscriptionId) break;

      const org = await db.organization.findUnique({
        where: { id: organizationId },
        select: { id: true },
      });
      if (org) {
        await db.organization.update({
          where: { id: organizationId },
          data: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            ...(planId ? { subscriptionPlanId: planId, subscriptionStatus: "active" as const } : {}),
          },
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
      const subscriptionId = sub.id;
      const status = mapStripeStatus(sub.status);
      const currentPeriodStart = sub.current_period_start
        ? new Date(sub.current_period_start * 1000)
        : null;
      const currentPeriodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null;
      const cancelAtPeriodEnd = sub.cancel_at_period_end ?? false;

      let planId: string | null = null;
      const priceId = sub.items?.data?.[0]?.price?.id;
      if (priceId) {
        const plan = await db.subscriptionPlan.findFirst({
          where: {
            active: true,
            OR: [
              { stripePriceId: priceId },
              { stripePriceIdYearly: priceId },
            ],
          },
          select: { id: true },
        });
        if (plan) planId = plan.id;
      }

      let organization = await db.organization.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
        select: { id: true },
      });
      if (!organization && customerId) {
        organization = await db.organization.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        });
      }

      if (organization) {
        const subscriptionStartedAt =
          sub.created != null && (status === "active" || status === "trialing")
            ? new Date(sub.created * 1000)
            : null;

        await db.subscription.upsert({
          where: { stripeSubscriptionId: subscriptionId },
          create: {
            organizationId: organization.id,
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: customerId,
            subscriptionPlanId: planId,
            status,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd,
            cancelledAt: status === "cancelled" ? new Date() : null,
          },
          update: {
            stripeCustomerId: customerId,
            subscriptionPlanId: planId ?? undefined,
            status,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd,
            cancelledAt: status === "cancelled" ? new Date() : undefined,
          },
        });

        await db.organization.update({
          where: { id: organization.id },
          data: {
            stripeCustomerId: customerId ?? undefined,
            stripeSubscriptionId: subscriptionId,
            subscriptionPlanId: planId ?? undefined,
            subscriptionStatus: status,
            subscriptionEndsAt: currentPeriodEnd ?? undefined,
            subscriptionStartedAt: subscriptionStartedAt ?? undefined,
          },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const subscriptionId = sub.id;

      const existing = await db.subscription.findUnique({
        where: { stripeSubscriptionId: subscriptionId },
        select: { id: true, organizationId: true },
      });

      if (existing) {
        await db.subscription.update({
          where: { id: existing.id },
          data: {
            status: "cancelled",
            cancelledAt: new Date(),
            currentPeriodEnd: new Date(),
          },
        });

        await db.organization.update({
          where: { id: existing.organizationId },
          data: {
            subscriptionStatus: "cancelled",
            stripeSubscriptionId: null,
            subscriptionEndsAt: new Date(),
          },
        });
      }
      break;
    }

    case "invoice.paid":
      break;

    default:
      break;
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

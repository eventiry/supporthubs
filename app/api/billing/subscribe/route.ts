import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";
import { getStripe } from "@/lib/stripe";
import { SUBSCRIPTION_ENABLED } from "@/lib/config";
import { setOrgToFreePlan } from "@/lib/subscription-defaults";

/**
 * POST /api/billing/subscribe — subscribe the current org to a plan (tenant auth required).
 * - Free plan (price 0): sets org subscription and status immediately, returns { success: true }.
 * - Paid plan: creates Stripe Checkout session, returns { url } to redirect.
 */
export async function POST(req: NextRequest) {
  if (!SUBSCRIPTION_ENABLED) {
    return NextResponse.json(
      { message: "Subscriptions are not enabled on this platform." },
      { status: 400 }
    );
  }

  const out = await getSessionUserAndTenant(req);
  if (out instanceof NextResponse) return out;

  const { user, tenant } = out;
  const organizationId = tenant.organizationId;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const planId = typeof (body as { planId?: string }).planId === "string" ? (body as { planId: string }).planId.trim() : "";
  if (!planId) {
    return NextResponse.json({ message: "planId is required" }, { status: 400 });
  }

  const plan = await db.subscriptionPlan.findUnique({
    where: { id: planId, active: true },
  });
  if (!plan) {
    return NextResponse.json({ message: "Plan not found or inactive" }, { status: 404 });
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, stripeCustomerId: true },
  });
  if (!org) {
    return NextResponse.json({ message: "Organization not found" }, { status: 404 });
  }

  const priceMonthly = plan.priceMonthly != null ? Number(plan.priceMonthly) : null;
  const priceYearly = plan.priceYearly != null ? Number(plan.priceYearly) : null;
  const isFree = (priceMonthly === 0 || priceMonthly == null) && (priceYearly === 0 || priceYearly == null);

  if (isFree) {
    await setOrgToFreePlan(organizationId, plan.id);
    return NextResponse.json({ success: true });
  }

  const stripePriceId = plan.stripePriceId ?? plan.stripePriceIdYearly;
  if (!stripePriceId) {
    return NextResponse.json(
      { message: "This plan is not set up for online payment. Contact support to subscribe." },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { message: "Billing is not configured. Contact support." },
      { status: 503 }
    );
  }

  const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, "") || "";
  const baseUrl = origin || (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  const successUrl = `${baseUrl}/dashboard/billing?subscribed=1`;
  const cancelUrl = `${baseUrl}/dashboard/billing?cancelled=1`;

  const sessionParams: {
    mode: "subscription";
    line_items: [{ price: string; quantity: number }];
    success_url: string;
    cancel_url: string;
    client_reference_id: string;
    metadata: { organizationId: string; planId: string };
    customer?: string;
    customer_email?: string;
  } = {
    mode: "subscription",
    line_items: [{ price: stripePriceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: organizationId,
    metadata: { organizationId, planId },
  };

  if (org.stripeCustomerId) {
    sessionParams.customer = org.stripeCustomerId;
  } else {
    sessionParams.customer_email = user.email;
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);
    return NextResponse.json({ url: session.url ?? undefined });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json(
      { message: `Could not start checkout: ${message}` },
      { status: 502 }
    );
  }
}

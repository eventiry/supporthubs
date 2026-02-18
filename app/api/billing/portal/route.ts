import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";
import { getStripe } from "@/lib/stripe";

/**
 * POST /api/billing/portal — create Stripe Customer Billing Portal session (tenant auth required).
 * Returns { url } to redirect the user to Stripe's portal to manage subscription, payment method, cancel, retry payment, etc.
 * Requires STRIPE_SECRET_KEY and the organization to have stripeCustomerId (set when they subscribed via Stripe).
 */
export async function POST(req: NextRequest) {
  const out = await getSessionUserAndTenant(req);
  if (out instanceof NextResponse) return out;

  const org = await db.organization.findUnique({
    where: { id: out.tenant.organizationId },
    select: { stripeCustomerId: true },
  });
  if (!org?.stripeCustomerId) {
    return NextResponse.json(
      { message: "Billing portal is not available. Contact support to manage your subscription." },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { message: "Billing portal is not configured. Contact support." },
      { status: 503 }
    );
  }

  let returnUrl: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof (body as { returnUrl?: string }).returnUrl === "string") {
      returnUrl = (body as { returnUrl: string }).returnUrl;
    }
  } catch {
    // no body
  }
  const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, "") || "";
  if (!returnUrl && origin) returnUrl = `${origin}/dashboard/billing`;
  if (!returnUrl) {
    return NextResponse.json(
      { message: "Provide returnUrl in the request body or allow same-origin requests." },
      { status: 400 }
    );
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: returnUrl,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json(
      { message: `Could not open billing portal: ${message}` },
      { status: 502 }
    );
  }
}

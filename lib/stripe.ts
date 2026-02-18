/**
 * Server-side Stripe helpers for creating/updating Product and Prices from subscription plans.
 * Used when STRIPE_SECRET_KEY is set: plan create/update will sync to Stripe so webhooks can match by price ID.
 */

import Stripe from "stripe";
import { STRIPE_SECRET_KEY } from "@/lib/config";

const CURRENCY = "gbp";

/** Pence per unit (Stripe uses smallest currency unit for GBP). */
function toUnitAmount(amount: number): number {
  return Math.round(amount * 100);
}

export function getStripe(): Stripe | null {
  if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.trim() === "") return null;
  return new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" });
}

export interface CreateProductAndPricesResult {
  productId: string;
  priceIdMonthly: string | null;
  priceIdYearly: string | null;
}

/**
 * Create a Stripe Product and one or two recurring Prices (monthly/yearly).
 * Prices are in GBP; amounts are converted to pence.
 */
export async function createProductAndPrices(
  name: string,
  description: string | null,
  priceMonthly: number | null,
  priceYearly: number | null
): Promise<CreateProductAndPricesResult> {
  const stripe = getStripe();
  if (!stripe) throw new Error("STRIPE_SECRET_KEY is not set");

  const product = await stripe.products.create({
    name,
    description: description ?? undefined,
  });

  let priceIdMonthly: string | null = null;
  let priceIdYearly: string | null = null;

  if (priceMonthly != null && priceMonthly > 0) {
    const price = await stripe.prices.create({
      product: product.id,
      currency: CURRENCY,
      unit_amount: toUnitAmount(priceMonthly),
      recurring: { interval: "month" },
    });
    priceIdMonthly = price.id;
  }

  if (priceYearly != null && priceYearly > 0) {
    const price = await stripe.prices.create({
      product: product.id,
      currency: CURRENCY,
      unit_amount: toUnitAmount(priceYearly),
      recurring: { interval: "year" },
    });
    priceIdYearly = price.id;
  }

  return {
    productId: product.id,
    priceIdMonthly,
    priceIdYearly,
  };
}

export interface CreatePricesForProductResult {
  priceIdMonthly: string | null;
  priceIdYearly: string | null;
}

/**
 * Create new Stripe Price(s) for an existing Product (e.g. when plan price changed).
 * Stripe prices are immutable, so we always create new ones.
 */
export async function createPricesForProduct(
  productId: string,
  priceMonthly: number | null,
  priceYearly: number | null
): Promise<CreatePricesForProductResult> {
  const stripe = getStripe();
  if (!stripe) throw new Error("STRIPE_SECRET_KEY is not set");

  let priceIdMonthly: string | null = null;
  let priceIdYearly: string | null = null;

  if (priceMonthly != null && priceMonthly > 0) {
    const price = await stripe.prices.create({
      product: productId,
      currency: CURRENCY,
      unit_amount: toUnitAmount(priceMonthly),
      recurring: { interval: "month" },
    });
    priceIdMonthly = price.id;
  }

  if (priceYearly != null && priceYearly > 0) {
    const price = await stripe.prices.create({
      product: productId,
      currency: CURRENCY,
      unit_amount: toUnitAmount(priceYearly),
      recurring: { interval: "year" },
    });
    priceIdYearly = price.id;
  }

  console.log(priceIdMonthly, priceIdYearly);
  return { priceIdMonthly, priceIdYearly };
}

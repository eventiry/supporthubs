/**
 * Seed subscription plans only (safe for production).
 * Does not create users, organizations, or demo data.
 *
 * When STRIPE_SECRET_KEY is set, paid plans get Stripe Product + Price IDs
 * (same behaviour as POST /api/platform/plans).
 *
 * Usage: pnpm db:seed:plans
 * Uses DATABASE_URL from .env — confirm it points to the intended database before running.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { setRequestRlsContext } from "../lib/db/rls";
import { getStripe, syncSubscriptionPlanStripePrices } from "../lib/stripe";

const prisma = new PrismaClient();

type PlanSeed = {
  name: string;
  slug: string;
  tier: string;
  description: string;
  features: string[];
  limits: Record<string, unknown>;
  priceMonthly: number | null;
  priceYearly: number | null;
};

const PLANS: PlanSeed[] = [
  {
    name: "Starter",
    slug: "starter",
    tier: "starter",
    description: "For small teams getting started with voucher management.",
    features: [
      "Up to 3 users",
      "Voucher issuance & redemption",
      "Client management",
      "Email support",
    ],
    limits: { maxUsers: 3, maxAgencies: 2, maxVouchersPerMonth: 100 },
    priceMonthly: 0,
    priceYearly: null,
  },
  {
    name: "Growth",
    slug: "growth",
    tier: "growth",
    description: "For growing teams that need more capacity and support.",
    features: [
      "Up to 15 users",
      "Voucher issuance & redemption",
      "Client management",
      "Multiple agencies & centres",
      "Reports & analytics",
      "Priority email support",
    ],
    limits: { maxUsers: 15, maxAgencies: 10, maxVouchersPerMonth: 500 },
    priceMonthly: 20,
    priceYearly: 120,
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    tier: "enterprise",
    description:
      "For large organisations with custom needs. Contact us for pricing and features.",
    features: [
      "Unlimited users",
      "Unlimited agencies & centres",
      "Unlimited vouchers",
      "Dedicated support",
      "Custom integrations",
      "SLA",
    ],
    limits: {},
    priceMonthly: null,
    priceYearly: null,
  },
];

async function upsertPlan(def: PlanSeed) {
  const plan = await prisma.subscriptionPlan.upsert({
    where: { slug: def.slug },
    update: {
      name: def.name,
      tier: def.tier,
      description: def.description,
      features: def.features,
      limits: def.limits as Prisma.InputJsonValue,
      priceMonthly: def.priceMonthly,
      priceYearly: def.priceYearly,
      active: true,
    },
    create: {
      name: def.name,
      slug: def.slug,
      tier: def.tier,
      description: def.description,
      features: def.features,
      limits: def.limits as Prisma.InputJsonValue,
      priceMonthly: def.priceMonthly,
      priceYearly: def.priceYearly,
      active: true,
    },
  });

  const priceMonthly =
    plan.priceMonthly != null ? Number(plan.priceMonthly) : null;
  const priceYearly = plan.priceYearly != null ? Number(plan.priceYearly) : null;

  const stripeFields = await syncSubscriptionPlanStripePrices({
    name: plan.name,
    description: plan.description,
    priceMonthly,
    priceYearly,
    stripeProductId: plan.stripeProductId,
    stripePriceId: plan.stripePriceId,
    stripePriceIdYearly: plan.stripePriceIdYearly,
  });

  if (!stripeFields) {
    return plan;
  }

  return prisma.subscriptionPlan.update({
    where: { id: plan.id },
    data: {
      stripeProductId: stripeFields.stripeProductId ?? undefined,
      stripePriceId: stripeFields.stripePriceId ?? undefined,
      stripePriceIdYearly: stripeFields.stripePriceIdYearly ?? undefined,
    },
  });
}

async function seedSubscriptionPlans() {
  await setRequestRlsContext(prisma, null, "super_admin");

  if (!getStripe()) {
    console.warn(
      "STRIPE_SECRET_KEY is not set — plans will be saved without Stripe product/price IDs."
    );
  }

  const results = [];
  for (const def of PLANS) {
    results.push(await upsertPlan(def));
  }
  return results;
}

async function main() {
  const plans = await seedSubscriptionPlans();
  console.log("Subscription plans seeded (upsert by slug):");
  for (const p of plans) {
    console.log(
      `  - ${p.slug} (${p.name}) active=${p.active}` +
        (p.stripePriceId ? ` monthly=${p.stripePriceId}` : "") +
        (p.stripePriceIdYearly ? ` yearly=${p.stripePriceIdYearly}` : "") +
        (p.stripeProductId ? ` product=${p.stripeProductId}` : "")
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

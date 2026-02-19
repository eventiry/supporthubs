"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { Button } from "@/components/button";
import { api } from "@/lib/api";
import { useSession } from "@/lib/contexts/session-context";
import { getErrorMessage } from "@/lib/utils";
import type { PublicPlanItem } from "@/lib/types";
import { Loading } from "@/components/ui/loading";

function formatPrice(monthly: number | null, yearly: number | null): string {
  if (monthly != null && monthly === 0 && (yearly == null || yearly === 0)) return "Free";
  if (monthly != null && monthly > 0) return `£${monthly}/mo`;
  if (yearly != null && yearly > 0) return `£${yearly}/yr`;
  return "Contact us";
}

/** Use plan features from API when present; otherwise derive from limits. */
function getFeatures(plan: PublicPlanItem): string[] {
  if (Array.isArray(plan.features) && plan.features.length > 0) {
    return plan.features;
  }
  const f: string[] = [];
  const limits = plan.limits ?? {};
  if (limits.maxUsers != null) f.push(`Up to ${limits.maxUsers} users`);
  else f.push("Unlimited users");
  if (limits.maxAgencies != null) f.push(`Up to ${limits.maxAgencies} agencies`);
  else f.push("Multiple agencies & centres");
  if (limits.maxVouchersPerMonth != null)
    f.push(`${limits.maxVouchersPerMonth} vouchers/month`);
  else f.push("Unlimited vouchers");
  f.push("Reports & analytics", "Email support");
  return f;
}

export default function PricingPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSession();
  const [plans, setPlans] = useState<PublicPlanItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const onSingleTenantMode = process.env.NEXT_PUBLIC_SINGLE_TENANT_MODE === "true";

  useEffect(() => {
    if (onSingleTenantMode) {
      router.replace("/dashboard");
      return;
    }
    api.plans
      .list()
      .then(setPlans)
      .catch(() => {
        setPlans([]);
        setError("Unable to load plans.");
      });
  }, [onSingleTenantMode, router]);

  if (onSingleTenantMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loading />
      </div>
    );
  }

  async function handleSubscribe(planId: string) {
    setSubscribeError(null);
    setSubscribingPlanId(planId);
    try {
      const res = await api.billing.subscribe(planId);
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      if (res.success) {
        router.push("/dashboard/billing");
      }
    } catch (err) {
      setSubscribeError(getErrorMessage(err));
    } finally {
      setSubscribingPlanId(null);
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background">
      <PublicNav />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your organisation. All plans include voucher management, client records, and secure access for your team.
          </p>
        </div>

        {plans === null ? (
          <div className="flex justify-center py-12">
            <Loading />
          </div>
        ) : error || plans.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {error ?? "No plans available at the moment."}
            </p>
            <Button asChild className="mt-4">
              <Link href="/contact">Contact us</Link>
            </Button>
          </div>
        ) : (
          <>
            {subscribeError && (
              <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {subscribeError}
              </div>
            )}
            <div className="grid gap-8 md:grid-cols-3">
              {plans.map((plan, index) => {
                const priceLabel = formatPrice(plan.priceMonthly, plan.priceYearly);
                const isFree = priceLabel === "Free";
                const isContact = priceLabel === "Contact us";
                const ctaLabel = isFree ? "Get started" : isContact ? "Contact us" : "Subscribe";
                const isSubscribing = subscribingPlanId === plan.id;
                const canSubscribe = user && !isContact;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl border bg-card p-6 flex flex-col ${
                      index === 1 ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-border"
                    }`}
                  >
                    {index === 1 && (
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                        Most popular
                      </span>
                    )}
                    <h2 className="text-xl font-semibold text-foreground">{plan.name}</h2>
                    {plan.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                    )}
                    <p className="mt-2 text-sm text-muted-foreground capitalize">{plan.tier}</p>
                    <p className="mt-4 text-2xl font-bold text-foreground">
                      {priceLabel}
                    </p>
                    <ul className="mt-6 space-y-3 flex-1">
                      {getFeatures(plan).map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                          <span className="text-primary" aria-hidden>✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {isContact ? (
                      <Button asChild className="mt-6 w-full" variant={index === 1 ? "default" : "outline"}>
                        <Link href="/contact">{ctaLabel}</Link>
                      </Button>
                    ) : canSubscribe ? (
                      <Button
                        className="mt-6 w-full"
                        variant={index === 1 ? "default" : "outline"}
                        disabled={isSubscribing || sessionLoading}
                        onClick={() => handleSubscribe(plan.id)}
                      >
                        {isSubscribing ? "Redirecting…" : ctaLabel}
                      </Button>
                    ) : (
                      <Button asChild className="mt-6 w-full" variant={index === 1 ? "default" : "outline"}>
                        <Link href={`/login?callbackUrl=${encodeURIComponent("/dashboard/billing")}`}>
                          {ctaLabel}
                        </Link>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Not sure which plan is right for you?{" "}
          <Link href="/contact" className="text-primary hover:underline underline-offset-2">
            Get in touch
          </Link>{" "}
          and we&apos;ll help you choose.
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}

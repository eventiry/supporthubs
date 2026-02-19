"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Button } from "@/components/button";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import type { BillingResponse, PublicPlanItem } from "@/lib/types";
import { Loading } from "@/components/ui/loading";
import { Banknote, ExternalLink, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const STATUS_LABELS: Record<string, string> = {
  none: "No subscription",
  trialing: "Trialing",
  active: "Active",
  past_due: "Past due",
  cancelled: "Cancelled",
};

function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatPrice(monthly: number | null, yearly: number | null): string {
  if (monthly != null && monthly === 0 && (yearly == null || yearly === 0)) return "Free";
  if (monthly != null && monthly > 0) return `£${monthly}/month`;
  if (yearly != null && yearly > 0) return `£${yearly}/year`;
  return "Contact us";
}

export default function BillingPage() {
  const { hasPermission, isLoading: rbacLoading } = useRbac();
  const canView = hasPermission(Permission.SETTINGS_READ);
  const router = useRouter();
  const [billing, setBilling] = useState<BillingResponse | null>(null);
  const [plans, setPlans] = useState<PublicPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [subscribePlanId, setSubscribePlanId] = useState<string | null>(null);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  // const onSingleTenantMode = process.env.NEXT_PUBLIC_SINGLE_TENANT_MODE === "true";
  const isBiilingActive =  process.env.SUBSCRIPTION_ENABLED === "true";
  useEffect(() => {
    if (isBiilingActive) {
      router.push("/dashboard");
      return;
    }
    if (canView) {
      Promise.all([api.billing.get(), api.plans.list().catch(() => [])])
        .then(([b, p]) => {
          setBilling(b);
          setPlans(Array.isArray(p) ? p : []);
        })
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setLoading(false));
    }
  }, [canView, isBiilingActive, router]);

  async function openPortal() {
    setPortalError(null);
    setPortalLoading(true);
    try {
      const returnUrl =
        typeof window !== "undefined" ? `${window.location.origin}/dashboard/billing` : undefined;
      const { url } = await api.billing.createPortalSession(returnUrl);
      if (url) window.location.href = url;
    } catch (err) {
      setPortalError(getErrorMessage(err));
    } finally {
      setPortalLoading(false);
    }
  }

  async function subscribeToPlan(planId: string) {
    setSubscribeError(null);
    setSubscribePlanId(planId);
    try {
      const res = await api.billing.subscribe(planId);
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      if (res.success) {
        const b = await api.billing.get();
        setBilling(b);
      }
    } catch (err) {
      setSubscribeError(getErrorMessage(err));
    } finally {
      setSubscribePlanId(null);
    }
  }

  if (rbacLoading || !canView) {
    return (
      <div className="p-6">
        {rbacLoading ? (
          <Loading />
        ) : (
          <p className="text-muted-foreground">You do not have access to this page.</p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <Loading />
      </div>
    );
  }

  if (error || !billing) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error ?? "Failed to load billing."}</p>
        <Button variant="default" className="mt-4" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const isPastDue = billing.status === "past_due";
  const isActiveOrTrialing = billing.status === "active" || billing.status === "trialing";
  const hasSubscription = billing.plan && isActiveOrTrialing;
  const showPortal = billing.canUsePortal && hasSubscription;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-foreground">Billing</h1>

      {!billing.subscriptionEnabled && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Subscriptions are currently managed by the platform. Contact your administrator or
              support to change your plan or billing.
            </p>
          </CardContent>
        </Card>
      )}

      {billing.subscriptionEnabled && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Current plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {billing.plan ? (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">{billing.plan.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{billing.plan.tier}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatPrice(billing.plan.priceMonthly, billing.plan.priceYearly)}
                      </p>
                    </div>
                    <span
                      className={
                        isPastDue
                          ? "text-amber-600 font-medium"
                          : billing.status === "cancelled"
                            ? "text-muted-foreground"
                            : "text-green-600"
                      }
                    >
                      {STATUS_LABELS[billing.status] ?? billing.status}
                    </span>
                  </div>
                  {billing.billingEmail && (
                    <p className="text-sm text-muted-foreground">
                      Billing email: {billing.billingEmail}
                    </p>
                  )}
                  {billing.subscriptionEndsAt && (
                    <p className="text-sm text-muted-foreground">
                      {billing.cancelAtPeriodEnd
                        ? `Access until ${formatDate(billing.subscriptionEndsAt)} (subscription will not renew)`
                        : `Next billing date: ${formatDate(billing.subscriptionEndsAt)}`}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  Your organisation does not have an active plan. Upgrade to unlock full features and
                  limits.
                </p>
              )}
            </CardContent>
          </Card>

          {isPastDue && (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
              <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Payment past due</p>
                    <p className="text-sm text-muted-foreground">
                      Update your payment method to avoid interruption. Use the billing portal to retry
                      payment.
                    </p>
                  </div>
                </div>
                {billing.canUsePortal && (
                  <Button
                    onClick={openPortal}
                    disabled={portalLoading}
                    className="sm:ml-auto flex-shrink-0"
                  >
                    {portalLoading ? "Opening…" : "Retry payment"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {portalError && (
            <p className="text-sm text-destructive">{portalError}</p>
          )}

          {subscribeError && (
            <p className="text-sm text-destructive">{subscribeError}</p>
          )}

          {plans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Choose a plan</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Subscribe to a plan below. Free plans activate immediately; paid plans open secure checkout.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {plans.map((plan) => {
                    const isCurrent = billing.plan?.id === plan.id && isActiveOrTrialing;
                    const isSubscribing = subscribePlanId === plan.id;
                    const priceLabel = formatPrice(plan.priceMonthly, plan.priceYearly);
                    const isContactUs = priceLabel === "Contact us";
                    return (
                      <div
                        key={plan.id}
                        className="flex flex-col rounded-lg border bg-muted/30 p-4"
                      >
                        <p className="font-medium text-foreground">{plan.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{plan.tier}</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {priceLabel}
                        </p>
                        <div className="mt-3 flex-1" />
                        {isCurrent ? (
                          <span className="text-sm text-muted-foreground">Current plan</span>
                        ) : isContactUs ? (
                          <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                            <Link href="/contact" target="_blank" rel="noopener noreferrer">
                              Contact us
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            disabled={isSubscribing}
                            onClick={() => subscribeToPlan(plan.id)}
                          >
                            {isSubscribing
                              ? "Redirecting…"
                              : priceLabel === "Free"
                                ? "Get started"
                                : "Subscribe"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-3">
            {showPortal && (
              <Button onClick={openPortal} disabled={portalLoading}>
                {portalLoading ? "Opening…" : "Manage billing"}
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/pricing">
                <ExternalLink className="h-4 w-4 mr-2" />
                View plans & upgrade
              </Link>
            </Button>
            {!billing.plan && (
              <Button variant="outline" asChild>
                <Link href="/contact">Contact us to subscribe</Link>
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Use <strong>Manage billing</strong> to update your payment method, cancel your
            subscription, or change plan. Upgrades and plan changes can also be done from the{" "}
            <Link href="/pricing" className="text-primary hover:underline">
              pricing page
            </Link>
            .
          </p>
        </>
      )}

      <Button variant="ghost" asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}

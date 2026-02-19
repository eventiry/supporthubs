"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/contexts/session-context";
import { api } from "@/lib/api";
import type { BillingResponse } from "@/lib/types";
import { Button } from "@/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";

/**
 * When SUBSCRIPTION_ENABLED, tenant users (organizationId set) must have an active
 * subscription (plan + status active/trialing). Platform admins are not gated.
 * Billing page is always allowed so users can subscribe.
 */
export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading: sessionLoading } = useSession();
  const [billing, setBilling] = useState<BillingResponse | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  const isBillingPage = pathname === "/dashboard/billing" || pathname?.startsWith("/dashboard/billing");
  const isSettingsPage = pathname === "/dashboard/settings" || pathname?.startsWith("/dashboard/settings");
  const isTenantUser = user?.organizationId != null && user.organizationId !== "";

  useEffect(() => {
    if (sessionLoading || !user || !isTenantUser || isBillingPage || isSettingsPage) {
      return;
    }
    setBillingLoading(true);
    api.billing
      .get()
      .then(setBilling)
      .catch(() => setBilling(null))
      .finally(() => setBillingLoading(false));
  }, [sessionLoading, user, isTenantUser, isBillingPage, isSettingsPage]);

  if (sessionLoading || !user) {
    return <>{children}</>;
  }
  if (!isTenantUser) {
    return <>{children}</>;
  }
  if (isBillingPage || isSettingsPage) {
    return <>{children}</>;
  }
  if (billingLoading) {
    return <>{children}</>;
  }
  if (!billing?.subscriptionEnabled) {
    return <>{children}</>;
  }
  const hasActivePlan =
    billing.plan && (billing.status === "active" || billing.status === "trialing");
  if (hasActivePlan) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Subscription required</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your organisation needs an active subscription to use the platform. Subscribe to a plan
            to continue.
          </p>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/billing">Choose a plan</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

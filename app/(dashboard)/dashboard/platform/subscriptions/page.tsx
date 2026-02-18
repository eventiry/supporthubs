"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
import type { SubscriptionListItem } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { Loading } from "@/components/ui/loading";

const STATUS_LABELS: Record<string, string> = {
  none: "None",
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
    month: "short",
    day: "numeric",
  });
}

export default function PlatformSubscriptionsPage() {
  const { hasPermission, isLoading: rbacLoading } = useRbac();
  const canView = hasPermission(Permission.ORGANIZATION_VIEW);

  const [subscriptions, setSubscriptions] = useState<SubscriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (canView) {
      api.platform.subscriptions
        .list()
        .then(setSubscriptions)
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setLoading(false));
    }
  }, [canView]);

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Subscriptions</h1>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>All subscriptions</CardTitle>
          <CardContent className="p-0 pt-4">
            <p className="text-sm text-muted-foreground">
              Subscription records from Stripe webhooks. Manage organizations to change plan or billing; cancellations sync via webhook.
            </p>
          </CardContent>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loading />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current period end</TableHead>
                  <TableHead>Cancel at period end</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No subscriptions yet. They are created when organizations subscribe via Stripe; ensure webhooks are configured.
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/platform/organizations/${sub.organizationId}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {sub.organizationName}
                        </Link>
                        <span className="text-muted-foreground text-sm block">{sub.organizationSlug}</span>
                      </TableCell>
                      <TableCell>{sub.subscriptionPlanName ?? "—"}</TableCell>
                      <TableCell>
                        <span
                          className={
                            sub.status === "active" || sub.status === "trialing"
                              ? "text-green-600"
                              : sub.status === "cancelled"
                                ? "text-muted-foreground"
                                : "text-amber-600"
                          }
                        >
                          {STATUS_LABELS[sub.status] ?? sub.status}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(sub.currentPeriodEnd)}</TableCell>
                      <TableCell>{sub.cancelAtPeriodEnd ? "Yes" : "—"}</TableCell>
                      <TableCell>{formatDate(sub.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

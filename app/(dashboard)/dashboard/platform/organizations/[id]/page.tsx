"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
import type { Organization, SubscriptionPlanListItem, SubscriptionStatusType } from "@/lib/types";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Loading } from "@/components/ui/loading";
import { ArrowLeft, Ban, CheckCircle } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

const SUBSCRIPTION_STATUS_OPTIONS: { value: SubscriptionStatusType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "trialing", label: "Trialing" },
  { value: "active", label: "Active" },
  { value: "past_due", label: "Past due" },
  { value: "cancelled", label: "Cancelled" },
];

export default function PlatformOrganizationDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { hasPermission, isLoading: rbacLoading } = useRbac();
  const canView = hasPermission(Permission.ORGANIZATION_VIEW);

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusActionLoading, setStatusActionLoading] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<Organization["status"]>("PENDING");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [subscriptionPlanId, setSubscriptionPlanId] = useState<string | "">("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusType>("none");
  const [billingEmail, setBillingEmail] = useState("");
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(true);

  useEffect(() => {
    if (!canView || !id) return;
    Promise.all([
      api.platform.organizations.get(id),
      api.platform.plans.list().catch(() => [] as SubscriptionPlanListItem[]),
      api.platform.config.get().catch(() => ({ subscriptionEnabled: false })),
    ])
      .then(([org, planList, config]) => {
        setOrganization(org);
        setName(org.name);
        setSlug(org.slug);
        setStatus(org.status);
        setLogoUrl(org.logoUrl ?? "");
        setPrimaryColor(org.primaryColor ?? "");
        setSecondaryColor(org.secondaryColor ?? "");
        setSubscriptionPlanId(org.subscriptionPlanId ?? "");
        setSubscriptionStatus((org.subscriptionStatus as SubscriptionStatusType) ?? "none");
        setBillingEmail(org.billingEmail ?? "");
        setPlans(planList);
        setSubscriptionEnabled(config.subscriptionEnabled);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [canView, id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!organization) return;
    setSaveError(null);
    setSaving(true);
    try {
      const updated = await api.platform.organizations.update(organization.id, {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        status,
        logoUrl: logoUrl.trim() || null,
        primaryColor: primaryColor.trim() || null,
        secondaryColor: secondaryColor.trim() || null,
        subscriptionPlanId: subscriptionPlanId.trim() || null,
        subscriptionStatus,
        billingEmail: billingEmail.trim() || null,
      });
      setOrganization(updated);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !organization) return;
    e.target.value = "";
    setLogoUploading(true);
    setSaveError(null);
    try {
      const result = await api.platform.organizations.uploadLogo(organization.id, file);
      setLogoUrl(result.logo);
      setOrganization(result.organization);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setLogoUploading(false);
    }
  }

  async function setStatusTo(newStatus: "ACTIVE" | "SUSPENDED") {
    if (!organization) return;
    setStatusActionLoading(newStatus);
    setSaveError(null);
    try {
      const updated = await api.platform.organizations.update(organization.id, {
        status: newStatus,
      });
      setOrganization(updated);
      setStatus(updated.status);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setStatusActionLoading(null);
    }
  }

  if (rbacLoading) {
    return (
      <div className="space-y-6">
        <Loading />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="space-y-6">
        <p className="text-destructive">You do not have permission to view this organization.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/platform/organizations">Back to organizations</Link>
        </Button>
      </div>
    );
  }

  if (loading || !organization) {
    return (
      <div className="space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Loading />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/platform/organizations">
            <ArrowLeft className="h-4 w-4" aria-label="Back" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold text-foreground">{organization.name}</h1>
      </div>

      {saveError && (
        <p className="text-sm text-destructive">{saveError}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Organization name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (subdomain)</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="org-slug"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as Organization["status"])}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="logoUrl"
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="min-w-0 flex-1"
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={logoUploading}
                    onChange={handleLogoUpload}
                  />
                  <Button type="button" variant="outline" size="sm" disabled={logoUploading} asChild>
                    <span>{logoUploading ? "Uploading…" : "Upload logo"}</span>
                  </Button>
                </label>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary colour</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#0066cc"
                    className="font-mono"
                  />
                  {primaryColor && (
                    <div
                      className="h-9 w-9 rounded border border-input shrink-0"
                      style={{ backgroundColor: primaryColor }}
                      title={primaryColor}
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary colour</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#004499"
                    className="font-mono"
                  />
                  {secondaryColor && (
                    <div
                      className="h-9 w-9 rounded border border-input shrink-0"
                      style={{ backgroundColor: secondaryColor }}
                      title={secondaryColor}
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="border-t border-border pt-4 mt-4">
              <h3 className="text-sm font-medium mb-3">Subscription</h3>
              {!subscriptionEnabled && (
                <p className="text-xs text-muted-foreground mb-3 rounded-md bg-muted/50 p-2">
                  Subscriptions are currently off. Set SUBSCRIPTION_ENABLED=true and configure Stripe webhooks to enable plan limits and automatic updates.
                </p>
              )}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subscriptionPlan">Plan</Label>
                  <select
                    id="subscriptionPlan"
                    value={subscriptionPlanId}
                    onChange={(e) => setSubscriptionPlanId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">No plan</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.tier})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subscriptionStatus">Subscription status</Label>
                  <select
                    id="subscriptionStatus"
                    value={subscriptionStatus}
                    onChange={(e) => setSubscriptionStatus(e.target.value as SubscriptionStatusType)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    {SUBSCRIPTION_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billingEmail">Billing email</Label>
                  <Input
                    id="billingEmail"
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    placeholder="billing@example.org"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              {organization.status === "ACTIVE" && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setStatusTo("SUSPENDED")}
                  disabled={!!statusActionLoading}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {statusActionLoading === "SUSPENDED" ? "Suspending…" : "Suspend"}
                </Button>
              )}
              {organization.status === "SUSPENDED" && (
                <Button
                  type="button"
                  variant="default"
                  onClick={() => setStatusTo("ACTIVE")}
                  disabled={!!statusActionLoading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {statusActionLoading === "ACTIVE" ? "Activating…" : "Activate"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

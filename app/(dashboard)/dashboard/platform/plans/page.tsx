"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
import type {
  SubscriptionPlanListItem,
  SubscriptionPlanCreatePayload,
  SubscriptionPlanUpdatePayload,
} from "@/lib/types";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/dialog";
import { Loading } from "@/components/ui/loading";
import { Plus, Pencil, Ban } from "lucide-react";

function slugFromName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatPrice(monthly: number | null, yearly: number | null): string {
  if (monthly != null && monthly === 0 && (yearly == null || yearly === 0)) return "Free";
  if (monthly != null && monthly > 0) return `£${monthly}/mo`;
  if (yearly != null && yearly > 0) return `£${yearly}/yr`;
  return "Contact us";
}

export default function PlatformPlansPage() {
  const { hasPermission, isLoading: rbacLoading } = useRbac();
  const canView = hasPermission(Permission.ORGANIZATION_VIEW);

  const [plans, setPlans] = useState<SubscriptionPlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formTier, setFormTier] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFeaturesText, setFormFeaturesText] = useState("");
  const [formPriceMonthly, setFormPriceMonthly] = useState("");
  const [formPriceYearly, setFormPriceYearly] = useState("");
  const [formLimits, setFormLimits] = useState("{}");

  useEffect(() => {
    if (canView) {
      api.platform.plans
        .list()
        .then(setPlans)
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setLoading(false));
    }
  }, [canView]);

  function openCreate() {
    setFormName("");
    setFormSlug("");
    setFormTier("starter");
    setFormDescription("");
    setFormFeaturesText("");
    setFormPriceMonthly("");
    setFormPriceYearly("");
    setFormLimits("{}");
    setCreateError(null);
    setShowCreate(true);
  }

  function openEdit(plan: SubscriptionPlanListItem) {
    setEditingId(plan.id);
    setFormName(plan.name);
    setFormSlug(plan.slug);
    setFormTier(plan.tier);
    setFormDescription(plan.description ?? "");
    setFormFeaturesText(Array.isArray(plan.features) ? plan.features.join("\n") : "");
    setFormPriceMonthly(plan.priceMonthly != null ? String(plan.priceMonthly) : "");
    setFormPriceYearly(plan.priceYearly != null ? String(plan.priceYearly) : "");
    setFormLimits(JSON.stringify(plan.limits ?? {}, null, 2));
    setEditError(null);
  }

  function closeEdit() {
    setEditingId(null);
  }

  function parseLimits(): Record<string, unknown> {
    try {
      const o = JSON.parse(formLimits);
      return typeof o === "object" && o !== null ? o : {};
    } catch {
      return {};
    }
  }

  function featuresArray(): string[] {
    return formFeaturesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    const name = formName.trim();
    const slug = formSlug.trim().toLowerCase();
    const tier = formTier.trim();
    if (!name || !slug || !tier) {
      setCreateError("Name, slug, and tier are required.");
      return;
    }
    setCreateLoading(true);
    try {
      const payload: SubscriptionPlanCreatePayload = {
        name,
        slug,
        tier,
        description: formDescription.trim() || null,
        features: featuresArray().length > 0 ? featuresArray() : null,
        limits: parseLimits(),
        priceMonthly: formPriceMonthly ? parseFloat(formPriceMonthly) : null,
        priceYearly: formPriceYearly ? parseFloat(formPriceYearly) : null,
      };
      const created = await api.platform.plans.create(payload);
      setPlans((prev) => [...prev, created].sort((a, b) => a.tier.localeCompare(b.tier)));
      setShowCreate(false);
    } catch (err) {
      setCreateError(getErrorMessage(err));
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null);
    const name = formName.trim();
    const slug = formSlug.trim().toLowerCase();
    const tier = formTier.trim();
    if (!name || !slug || !tier) {
      setEditError("Name, slug, and tier are required.");
      return;
    }
    setEditLoading(true);
    try {
      const payload: SubscriptionPlanUpdatePayload = {
        name,
        slug,
        tier,
        description: formDescription.trim() || null,
        features: featuresArray().length > 0 ? featuresArray() : null,
        limits: parseLimits(),
        priceMonthly: formPriceMonthly ? parseFloat(formPriceMonthly) : null,
        priceYearly: formPriceYearly ? parseFloat(formPriceYearly) : null,
      };
      const updated = await api.platform.plans.update(editingId, payload);
      setPlans((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      closeEdit();
    } catch (err) {
      setEditError(getErrorMessage(err));
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeactivate(plan: SubscriptionPlanListItem) {
    if (!confirm(`Deactivate plan "${plan.name}"? It will no longer appear on the pricing page or for new subscriptions.`)) return;
    setDeactivatingId(plan.id);
    try {
      await api.platform.plans.delete(plan.id);
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, active: false } : p)));
    } catch {
      // keep list as-is
    } finally {
      setDeactivatingId(null);
    }
  }

  if (rbacLoading || !canView) {
    return (
      <div className="p-6">
        {rbacLoading ? <Loading /> : <p className="text-muted-foreground">You do not have access to this page.</p>}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Subscription plans</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New plan
        </Button>
      </div>

      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}

      {loading ? (
        <Loading />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Plans</CardTitle>
            <CardContent className="p-0 pt-4">
              <p className="text-sm text-muted-foreground">
                Manage plans shown on the public pricing page. Set description and features for each plan. Deactivating hides a plan from new signups.
              </p>
            </CardContent>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No plans yet. Create one to show on the pricing page.
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>{plan.slug}</TableCell>
                      <TableCell className="capitalize">{plan.tier}</TableCell>
                      <TableCell>{formatPrice(plan.priceMonthly, plan.priceYearly)}</TableCell>
                      <TableCell>{plan.active ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(plan)}
                            disabled={!plan.active}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {plan.active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivate(plan)}
                              disabled={deactivatingId === plan.id}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New subscription plan</DialogTitle>
            <DialogDescription>
              Plan will appear on the public pricing page. Use features (one per line) for the checklist.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (!formSlug || formSlug === slugFromName(formName)) setFormSlug(slugFromName(e.target.value));
                }}
                placeholder="Starter"
              />
            </div>
            <div>
              <Label htmlFor="create-slug">Slug</Label>
              <Input
                id="create-slug"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                placeholder="starter"
              />
            </div>
            <div>
              <Label htmlFor="create-tier">Tier</Label>
              <Input
                id="create-tier"
                value={formTier}
                onChange={(e) => setFormTier(e.target.value)}
                placeholder="starter"
              />
            </div>
            <div>
              <Label htmlFor="create-desc">Description (optional)</Label>
              <Input
                id="create-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="For small teams..."
              />
            </div>
            <div>
              <Label htmlFor="create-features">Features (one per line)</Label>
              <textarea
                id="create-features"
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formFeaturesText}
                onChange={(e) => setFormFeaturesText(e.target.value)}
                placeholder="Up to 3 users\nVoucher issuance\n..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-monthly">Price monthly (£)</Label>
                <Input
                  id="create-monthly"
                  type="number"
                  step="0.01"
                  value={formPriceMonthly}
                  onChange={(e) => setFormPriceMonthly(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="create-yearly">Price yearly (£)</Label>
                <Input
                  id="create-yearly"
                  type="number"
                  step="0.01"
                  value={formPriceYearly}
                  onChange={(e) => setFormPriceYearly(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Stripe Price IDs are created automatically when you set monthly/yearly prices and STRIPE_SECRET_KEY is configured. Webhooks then match subscriptions to this plan.
            </p>
            <div>
              <Label htmlFor="create-limits">Limits (JSON)</Label>
              <textarea
                id="create-limits"
                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                value={formLimits}
                onChange={(e) => setFormLimits(e.target.value)}
                placeholder='{"maxUsers": 3, "maxAgencies": 2}'
              />
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading}>
                Create plan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingId} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit subscription plan</DialogTitle>
            <DialogDescription>
              Changes apply to the pricing page and to limit checks for organizations on this plan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              />
            </div>
            <div>
              <Label htmlFor="edit-tier">Tier</Label>
              <Input
                id="edit-tier"
                value={formTier}
                onChange={(e) => setFormTier(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-desc">Description (optional)</Label>
              <Input
                id="edit-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-features">Features (one per line)</Label>
              <textarea
                id="edit-features"
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formFeaturesText}
                onChange={(e) => setFormFeaturesText(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-monthly">Price monthly (£)</Label>
                <Input
                  id="edit-monthly"
                  type="number"
                  step="0.01"
                  value={formPriceMonthly}
                  onChange={(e) => setFormPriceMonthly(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-yearly">Price yearly (£)</Label>
                <Input
                  id="edit-yearly"
                  type="number"
                  step="0.01"
                  value={formPriceYearly}
                  onChange={(e) => setFormPriceYearly(e.target.value)}
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Stripe Price IDs are set automatically when you save prices (STRIPE_SECRET_KEY required).</p>
              {editingId && (() => {
                const plan = plans.find((p) => p.id === editingId);
                if (!plan?.stripePriceId && !plan?.stripePriceIdYearly) return null;
                return (
                  <p className="font-mono text-foreground/80">
                    {plan.stripePriceId && <span>Monthly: {plan.stripePriceId}</span>}
                    {plan.stripePriceIdYearly && <span className="block">Yearly: {plan.stripePriceIdYearly}</span>}
                  </p>
                );
              })()}
            </div>
            <div>
              <Label htmlFor="edit-limits">Limits (JSON)</Label>
              <textarea
                id="edit-limits"
                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                value={formLimits}
                onChange={(e) => setFormLimits(e.target.value)}
              />
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeEdit}>
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading}>
                Save changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

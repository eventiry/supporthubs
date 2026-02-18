"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
import type { OrganizationListItem } from "@/lib/types";
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
import { Plus, ExternalLink, CheckCircle } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  CANCELLED: "Cancelled",
};

export default function PlatformOrganizationsPage() {
  const { hasPermission, isLoading: rbacLoading } = useRbac();
  const canView = hasPermission(Permission.ORGANIZATION_VIEW);

  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createStatus, setCreateStatus] = useState<"PENDING" | "ACTIVE">("PENDING");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    if (canView) {
      api.platform.organizations
        .list()
        .then(setOrganizations)
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setLoading(false));
    }
  }, [canView]);

  function slugFromName(name: string) {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleNameChange(name: string) {
    setCreateName(name);
    if (!createSlug || createSlug === slugFromName(createName)) {
      setCreateSlug(slugFromName(name));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    const name = createName.trim();
    const slug = createSlug.trim().toLowerCase();
    if (!name) {
      setCreateError("Name is required.");
      return;
    }
    if (!slug) {
      setCreateError("Slug is required.");
      return;
    }
    setCreateLoading(true);
    try {
      await api.platform.organizations.create({ name, slug, status: createStatus });
      const list = await api.platform.organizations.list();
      setOrganizations(list);
      setShowCreate(false);
      setCreateName("");
      setCreateSlug("");
      setCreateStatus("PENDING");
    } catch (err) {
      setCreateError(getErrorMessage(err));
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleApprove(orgId: string) {
    setApprovingId(orgId);
    try {
      await api.platform.organizations.update(orgId, { status: "ACTIVE" });
      const list = await api.platform.organizations.list();
      setOrganizations(list);
    } catch {
      // could set error state
    } finally {
      setApprovingId(null);
    }
  }

  if (rbacLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Organizations</h1>
        <Loading />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Organizations</h1>
        <p className="text-destructive">You do not have permission to view platform organizations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Organizations</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add organization
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Manage tenant organizations. Each organization has its own subdomain and isolated data.
      </p>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All organizations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
              <Loading />
            ) : organizations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No organizations yet. Create one to get started.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell className="font-mono text-sm">{org.slug}</TableCell>
                      <TableCell>{STATUS_LABELS[org.status] ?? org.status}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="flex items-center gap-1">
                        {org.status === "PENDING" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApprove(org.id)}
                            disabled={!!approvingId}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {approvingId === org.id ? "Approving…" : "Approve"}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/platform/organizations/${org.id}`}>
                            <ExternalLink className="h-4 w-4" aria-label="View" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New organization</DialogTitle>
            <DialogDescription>
              Create a new tenant organization. The slug is used in the subdomain (e.g. {createSlug || "slug"}.supporthubs.org).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Acme Food Bank"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-slug">Slug (subdomain)</Label>
              <Input
                id="create-slug"
                value={createSlug}
                onChange={(e) => setCreateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="acme-food-bank"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-status">Initial status</Label>
              <select
                id="create-status"
                value={createStatus}
                onChange={(e) => setCreateStatus(e.target.value as "PENDING" | "ACTIVE")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="PENDING">Pending</option>
                <option value="ACTIVE">Active</option>
              </select>
            </div>
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

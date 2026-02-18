"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
import type { InvitationListItem, InvitationCreatePayload } from "@/lib/types";
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
import { Plus } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  USED: "Used",
  EXPIRED: "Expired",
};
const CUSTOME_MESSAGE = "Thank you for your interest to use the Support Hubs application for your organization. its a pleasure having your organization onboard."
function createdByLabel(inv: InvitationListItem): string {
  if (inv.createdBy) {
    const { firstName, lastName, email } = inv.createdBy;
    const name = [firstName, lastName].filter(Boolean).join(" ").trim();
    return name || email;
  }
  return "—";
}

export default function PlatformInvitationsPage() {
  const { hasPermission, isLoading: rbacLoading } = useRbac();
  const canView = hasPermission(Permission.ORGANIZATION_VIEW);

  const [invitations, setInvitations] = useState<InvitationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createOrganizationName, setCreateOrganizationName] = useState("");
  const [createSubdomainSlug, setCreateSubdomainSlug] = useState("");
  const [createCustomMessage, setCreateCustomMessage] = useState(CUSTOME_MESSAGE);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (canView) {
      api.platform.invitations
        .list()
        .then(setInvitations)
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setLoading(false));
    }
  }, [canView]);

  function slugFromName(name: string) {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .replace(/^-|-$/g, "");
  }

  function handleOrganizationNameChange(name: string) {
    setCreateOrganizationName(name);
    if (!createSubdomainSlug || createSubdomainSlug === slugFromName(createOrganizationName)) {
      setCreateSubdomainSlug(slugFromName(name));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    const email = createEmail.trim();
    const organizationName = createOrganizationName.trim();
    const subdomainSlug = createSubdomainSlug.trim().toLowerCase();
    if (!email) {
      setCreateError("Email is required.");
      return;
    }
    if (!organizationName) {
      setCreateError("Organization name is required.");
      return;
    }
    if (!subdomainSlug) {
      setCreateError("Subdomain slug is required.");
      return;
    }
    setCreateLoading(true);
    try {
      const payload: InvitationCreatePayload = {
        email,
        organizationName,
        subdomainSlug,
      };
      if (createCustomMessage.trim()) payload.customMessage = createCustomMessage.trim();
      await api.platform.invitations.create(payload);
      const list = await api.platform.invitations.list();
      setInvitations(list);
      setShowCreate(false);
      setCreateEmail("");
      setCreateOrganizationName("");
      setCreateSubdomainSlug("");
      setCreateCustomMessage("");
    } catch (err) {
      setCreateError(getErrorMessage(err));
    } finally {
      setCreateLoading(false);
    }
  }

  if (rbacLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Invitations</h1>
        <Loading />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Invitations</h1>
        <p className="text-destructive">You do not have permission to view platform invitations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Invitations</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create invitation
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Send invitation emails to onboard new organizations. Each invitation includes a one-time join link.
      </p>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loading />
          ) : invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invitations yet. Create one to invite an organization.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Subdomain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>{inv.organizationName}</TableCell>
                    <TableCell className="font-mono text-sm">{inv.subdomainSlug}</TableCell>
                    <TableCell>{STATUS_LABELS[inv.status] ?? inv.status}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {createdByLabel(inv)}
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
            <DialogTitle>Create invitation</DialogTitle>
            <DialogDescription>
              Send an email with a one-time join link. The recipient will set up their organization and first admin account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="admin@example.org"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-org-name">Organization name</Label>
              <Input
                id="create-org-name"
                value={createOrganizationName}
                onChange={(e) => handleOrganizationNameChange(e.target.value)}
                placeholder="Acme Food Bank"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-slug">Subdomain slug</Label>
              <Input
                id="create-slug"
                value={createSubdomainSlug}
                onChange={(e) => setCreateSubdomainSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="acme-food-bank"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-message">Custom message (optional)</Label>
              <Input
                id="create-message"
                value={createCustomMessage}
                onChange={(e) => setCreateCustomMessage(e.target.value)}
                placeholder="Optional note in the email"
              />
            </div>
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading ? "Sending…" : "Send invitation"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

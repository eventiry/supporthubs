"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
import type { Agency } from "@/lib/types";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/alert-dialog";
import { Loading } from "@/components/ui/loading";
import { Eye, Pencil, Trash2 } from "lucide-react";

export default function AgenciesPage() {
  const { hasPermission, isLoading: rbacLoading } = useRbac();
  const canManage = hasPermission(Permission.USER_MANAGE);

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [viewAgency, setViewAgency] = useState<Agency | null>(null);
  const [editAgency, setEditAgency] = useState<Agency | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteAgency, setDeleteAgency] = useState<Agency | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAgencies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return agencies;
    return agencies.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.contactPhone ?? "").toLowerCase().includes(q) ||
        (a.contactEmail ?? "").toLowerCase().includes(q)
    );
  }, [agencies, searchQuery]);

  useEffect(() => {
    if (canManage) {
      api.agencies
        .list()
        .then(setAgencies)
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setLoading(false));
    }
  }, [canManage]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    const name = createName.trim();
    if (!name) {
      setCreateError("Agency name is required.");
      return;
    }
    setCreateLoading(true);
    try {
      await api.agencies.create({
        name,
        contactPhone: createPhone.trim() || undefined,
        contactEmail: createEmail.trim() || undefined,
      });
      api.agencies.list().then(setAgencies);
      setShowCreate(false);
      setCreateName("");
      setCreatePhone("");
      setCreateEmail("");
    } catch (err) {
      setCreateError(getErrorMessage(err));
    } finally {
      setCreateLoading(false);
    }
  }

  function openEdit(a: Agency) {
    setEditAgency(a);
    setEditName(a.name);
    setEditPhone(a.contactPhone ?? "");
    setEditEmail(a.contactEmail ?? "");
    setEditError(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editAgency) return;
    setEditError(null);
    const name = editName.trim();
    if (!name) {
      setEditError("Agency name is required.");
      return;
    }
    setEditLoading(true);
    try {
      await api.agencies.update(editAgency.id, {
        name,
        contactPhone: editPhone.trim() || null,
        contactEmail: editEmail.trim() || null,
      });
      api.agencies.list().then(setAgencies);
      setEditAgency(null);
    } catch (err) {
      setEditError(getErrorMessage(err));
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteAgency) return;
    setDeleteLoading(true);
    try {
      await api.agencies.delete(deleteAgency.id);
      setAgencies((prev) => prev.filter((a) => a.id !== deleteAgency.id));
      setDeleteAgency(null);
    } catch {
      // could set error state
    } finally {
      setDeleteLoading(false);
    }
  }

  if (rbacLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Agencies</h1>
        <Loading />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Agencies</h1>
        <p className="text-destructive">You do not have permission to manage agencies.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Agencies</h1>
        <Button onClick={() => setShowCreate(true)}>Add agency</Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Referral agencies are the organisations that refer clients and issue vouchers (e.g. Citizens Advice, charities).
        Create agencies here, then assign them to third-party users on the Users page.
      </p>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New agency</DialogTitle>
            <DialogDescription>
              Add a referral agency. You can then select it when creating a third-party user.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agency-name">Name *</Label>
              <Input
                id="agency-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Citizens Advice North"
                required
                disabled={createLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agency-phone">Contact phone</Label>
              <Input
                id="agency-phone"
                type="tel"
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
                placeholder="Optional"
                disabled={createLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agency-email">Contact email</Label>
              <Input
                id="agency-email"
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="Optional"
                disabled={createLoading}
              />
            </div>
            {createError && (
              <p className="text-sm text-destructive" role="alert">
                {createError}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={createLoading}>
                {createLoading ? "Creating…" : "Create agency"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreate(false);
                  setCreateError(null);
                  setCreateName("");
                  setCreatePhone("");
                  setCreateEmail("");
                }}
                disabled={createLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewAgency} onOpenChange={(open) => !open && setViewAgency(null)}>
        <DialogContent>
          {viewAgency && (
            <>
              <DialogHeader>
                <DialogTitle>{viewAgency.name}</DialogTitle>
                <DialogDescription>Agency details</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Contact phone</span>
                  <p className="mt-0.5">{viewAgency.contactPhone ?? "—"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Contact email</span>
                  <p className="mt-0.5">{viewAgency.contactEmail ?? "—"}</p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setViewAgency(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editAgency} onOpenChange={(open) => !open && setEditAgency(null)}>
        <DialogContent>
          {editAgency && (
            <>
              <DialogHeader>
                <DialogTitle>Edit agency</DialogTitle>
                <DialogDescription>Update agency details.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEdit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-agency-name">Name *</Label>
                  <Input
                    id="edit-agency-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Citizens Advice North"
                    required
                    disabled={editLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-agency-phone">Contact phone</Label>
                  <Input
                    id="edit-agency-phone"
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Optional"
                    disabled={editLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-agency-email">Contact email</Label>
                  <Input
                    id="edit-agency-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Optional"
                    disabled={editLoading}
                  />
                </div>
                {editError && (
                  <p className="text-sm text-destructive" role="alert">
                    {editError}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button type="submit" disabled={editLoading}>
                    {editLoading ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditAgency(null)}
                    disabled={editLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAgency} onOpenChange={(open) => !open && setDeleteAgency(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete agency?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteAgency
                ? `"${deleteAgency.name}" will be permanently deleted. Users linked to this agency will have their agency unset. This cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle>All agencies</CardTitle>
          <p className="text-sm text-muted-foreground">
            {agencies.length === 0
              ? "No agencies yet. Add one above to assign to third-party users."
              : "These agencies can be selected when creating or editing a third-party user."}
          </p>
          <div className="pt-2">
            <Input
              type="search"
              placeholder="Search by name, phone, or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <Loading className="p-6" />
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : agencies.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No agencies found.</p>
          ) : filteredAgencies.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No agencies match your search.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact phone</TableHead>
                  <TableHead>Contact email</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgencies.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-muted-foreground">{a.contactPhone ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{a.contactEmail ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewAgency(a)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(a)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteAgency(a)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
import type { FoodBankCenter } from "@/lib/types";
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

export default function CentersPage() {
  const { hasPermission, isLoading: rbacLoading } = useRbac();
  const canManage = hasPermission(Permission.USER_MANAGE);

  const [centers, setCenters] = useState<FoodBankCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createAddress, setCreateAddress] = useState("");
  const [createPostcode, setCreatePostcode] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createCanDeliver, setCreateCanDeliver] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [viewCenter, setViewCenter] = useState<FoodBankCenter | null>(null);
  const [editCenter, setEditCenter] = useState<FoodBankCenter | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPostcode, setEditPostcode] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCanDeliver, setEditCanDeliver] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteCenter, setDeleteCenter] = useState<FoodBankCenter | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [canDeliverFilter, setCanDeliverFilter] = useState<"" | "yes" | "no">("");

  const filteredCenters = useMemo(() => {
    let list = centers;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.address ?? "").toLowerCase().includes(q) ||
          (c.postcode ?? "").toLowerCase().includes(q) ||
          (c.phone ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q)
      );
    }
    if (canDeliverFilter === "yes") list = list.filter((c) => c.canDeliver);
    if (canDeliverFilter === "no") list = list.filter((c) => !c.canDeliver);
    return list;
  }, [centers, searchQuery, canDeliverFilter]);

  useEffect(() => {
    if (canManage) {
      api.centers
        .list()
        .then(setCenters)
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setLoading(false));
    }
  }, [canManage]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    const name = createName.trim();
    if (!name) {
      setCreateError("Centre name is required.");
      return;
    }
    setCreateLoading(true);
    try {
      await api.centers.create({
        name,
        address: createAddress.trim() || undefined,
        postcode: createPostcode.trim() || undefined,
        phone: createPhone.trim() || undefined,
        email: createEmail.trim() || undefined,
        canDeliver: createCanDeliver,
      });
      api.centers.list().then(setCenters);
      setShowCreate(false);
      setCreateName("");
      setCreateAddress("");
      setCreatePostcode("");
      setCreatePhone("");
      setCreateEmail("");
      setCreateCanDeliver(false);
    } catch (err) {
      setCreateError(getErrorMessage(err));
    } finally {
      setCreateLoading(false);
    }
  }

  function openEdit(c: FoodBankCenter) {
    setEditCenter(c);
    setEditName(c.name);
    setEditAddress(c.address ?? "");
    setEditPostcode(c.postcode ?? "");
    setEditPhone(c.phone ?? "");
    setEditEmail(c.email ?? "");
    setEditCanDeliver(c.canDeliver);
    setEditError(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editCenter) return;
    setEditError(null);
    const name = editName.trim();
    if (!name) {
      setEditError("Centre name is required.");
      return;
    }
    setEditLoading(true);
    try {
      await api.centers.update(editCenter.id, {
        name,
        address: editAddress.trim() || null,
        postcode: editPostcode.trim() || null,
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
        canDeliver: editCanDeliver,
      });
      api.centers.list().then(setCenters);
      setEditCenter(null);
    } catch (err) {
      setEditError(getErrorMessage(err));
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteCenter) return;
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await api.centers.delete(deleteCenter.id);
      setCenters((prev) => prev.filter((c) => c.id !== deleteCenter.id));
      setDeleteCenter(null);
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setDeleteLoading(false);
    }
  }

  if (rbacLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Food bank centres</h1>
        <Loading />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Food bank centres</h1>
        <p className="text-destructive">You do not have permission to manage centres.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Food bank centres</h1>
        <Button onClick={() => setShowCreate(true)}>Add centre</Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Centres are the physical locations where vouchers can be collected or redeemed.
        Add centres here; they appear in the voucher issue and redeem flows.
      </p>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New centre</DialogTitle>
            <DialogDescription>
              Add a food bank centre. Name is required; other fields are optional.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="center-name">Name *</Label>
              <Input
                id="center-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. North East Food Bank"
                required
                disabled={createLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="center-address">Address</Label>
              <Input
                id="center-address"
                value={createAddress}
                onChange={(e) => setCreateAddress(e.target.value)}
                placeholder="Optional"
                disabled={createLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="center-postcode">Postcode</Label>
              <Input
                id="center-postcode"
                value={createPostcode}
                onChange={(e) => setCreatePostcode(e.target.value)}
                placeholder="Optional"
                disabled={createLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="center-phone">Phone</Label>
              <Input
                id="center-phone"
                type="tel"
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
                placeholder="Optional"
                disabled={createLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="center-email">Email</Label>
              <Input
                id="center-email"
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="Optional"
                disabled={createLoading}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="center-canDeliver"
                checked={createCanDeliver}
                onChange={(e) => setCreateCanDeliver(e.target.checked)}
                className="h-4 w-4 rounded border-input"
                disabled={createLoading}
              />
              <Label htmlFor="center-canDeliver" className="cursor-pointer">
                Can deliver
              </Label>
            </div>
            {createError && (
              <p className="text-sm text-destructive" role="alert">
                {createError}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={createLoading}>
                {createLoading ? "Creating…" : "Create centre"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreate(false);
                  setCreateError(null);
                  setCreateName("");
                  setCreateAddress("");
                  setCreatePostcode("");
                  setCreatePhone("");
                  setCreateEmail("");
                  setCreateCanDeliver(false);
                }}
                disabled={createLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewCenter} onOpenChange={(open) => !open && setViewCenter(null)}>
        <DialogContent>
          {viewCenter && (
            <>
              <DialogHeader>
                <DialogTitle>{viewCenter.name}</DialogTitle>
                <DialogDescription>Centre details</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                {(viewCenter.address || viewCenter.postcode) && (
                  <div>
                    <span className="font-medium text-muted-foreground">Address</span>
                    <p className="mt-0.5">
                      {[viewCenter.address, viewCenter.postcode].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                )}
                <div>
                  <span className="font-medium text-muted-foreground">Phone</span>
                  <p className="mt-0.5">{viewCenter.phone ?? "—"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Email</span>
                  <p className="mt-0.5">{viewCenter.email ?? "—"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Can deliver</span>
                  <p className="mt-0.5">{viewCenter.canDeliver ? "Yes" : "No"}</p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setViewCenter(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCenter} onOpenChange={(open) => !open && setEditCenter(null)}>
        <DialogContent>
          {editCenter && (
            <>
              <DialogHeader>
                <DialogTitle>Edit centre</DialogTitle>
                <DialogDescription>Update centre details.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEdit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-center-name">Name *</Label>
                  <Input
                    id="edit-center-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. North East Food Bank"
                    required
                    disabled={editLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-center-address">Address</Label>
                  <Input
                    id="edit-center-address"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Optional"
                    disabled={editLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-center-postcode">Postcode</Label>
                  <Input
                    id="edit-center-postcode"
                    value={editPostcode}
                    onChange={(e) => setEditPostcode(e.target.value)}
                    placeholder="Optional"
                    disabled={editLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-center-phone">Phone</Label>
                  <Input
                    id="edit-center-phone"
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Optional"
                    disabled={editLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-center-email">Email</Label>
                  <Input
                    id="edit-center-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Optional"
                    disabled={editLoading}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-center-canDeliver"
                    checked={editCanDeliver}
                    onChange={(e) => setEditCanDeliver(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                    disabled={editLoading}
                  />
                  <Label htmlFor="edit-center-canDeliver" className="cursor-pointer">
                    Can deliver
                  </Label>
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
                    onClick={() => setEditCenter(null)}
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

      <AlertDialog open={!!deleteCenter} onOpenChange={(open) => !open && (setDeleteCenter(null), setDeleteError(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete centre?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCenter
                ? `"${deleteCenter.name}" will be permanently deleted. This cannot be undone. Centres that have redemptions linked cannot be deleted.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive" role="alert">
              {deleteError}
            </p>
          )}
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
          <CardTitle>All centres</CardTitle>
          <p className="text-sm text-muted-foreground">
            {centers.length === 0
              ? "No centres yet. Add one above to use in the voucher flow."
              : "These centres can be selected when issuing or redeeming vouchers."}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Input
              type="search"
              placeholder="Search by name, address, postcode, phone, email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <select
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={canDeliverFilter}
              onChange={(e) => setCanDeliverFilter(e.target.value as "" | "yes" | "no")}
            >
              <option value="">All (can deliver)</option>
              <option value="yes">Can deliver only</option>
              <option value="no">Cannot deliver</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <Loading className="p-6" />
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : centers.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No centres found.</p>
          ) : filteredCenters.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No centres match your search or filter.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Postcode</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Can deliver</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCenters.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.address ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.postcode ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email ?? "—"}</TableCell>
                    <TableCell>{c.canDeliver ? "Yes" : "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewCenter(c)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(c)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteCenter(c)}
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

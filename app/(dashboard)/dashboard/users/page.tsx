"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
import type { UserListItem, Agency, UserRole, UserStatus } from "@/lib/types";
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
} from "@/components/dialog";
import { Loading } from "@/components/ui/loading";

export default function UsersPage() {
  const { hasPermission, isLoading: rbacLoading } = useRbac();
  const canManage = hasPermission(Permission.USER_MANAGE);

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [agencyFilter, setAgencyFilter] = useState("");
  const [editUser, setEditUser] = useState<UserListItem | null>(null);
  const [editStatus, setEditStatus] = useState<UserStatus>("ACTIVE");
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createRole, setCreateRole] = useState<"admin" | "third_party" | "back_office">("back_office");
  const [createAgencyId, setCreateAgencyId] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const userDialogOpen = showCreate || !!editUser;
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  useEffect(() => {
    if (canManage) {
      const params: { role?: UserRole; agencyId?: string } = {};
      if (roleFilter) params.role = roleFilter as UserRole;
      if (agencyFilter) params.agencyId = agencyFilter;
      api.users
        .list(params)
        .then(setUsers)
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setLoading(false));
    }
  }, [canManage, roleFilter, agencyFilter]);

  useEffect(() => {
    if (canManage) api.agencies.list().then(setAgencies).catch(() => {});
  }, [canManage]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (!createEmail.trim() || !createPassword || !createFirstName.trim() || !createLastName.trim()) {
      setCreateError("Email, password, first name and last name are required.");
      return;
    }
    if (createRole === "third_party" && !createAgencyId) {
      setCreateError("Agency is required for third-party users.");
      return;
    }
    if (createRole === "back_office" && createAgencyId) {
      setCreateAgencyId("")
    }
    setCreateLoading(true);
    try {
      await api.users.create({
        email: createEmail.trim(),
        password: createPassword,
        firstName: createFirstName.trim(),
        lastName: createLastName.trim(),
        role: createRole,
        agencyId: createAgencyId || undefined,
      });
      api.users.list({ role: (roleFilter || undefined) as UserRole | undefined, agencyId: agencyFilter || undefined }).then(setUsers);
      setShowCreate(false);
      setCreateEmail("");
      setCreatePassword("");
      setCreateFirstName("");
      setCreateLastName("");
      setCreateRole("back_office");
      setCreateAgencyId("");
    } catch (err) {
      setCreateError(getErrorMessage(err));
    } finally {
      setCreateLoading(false);
    }
  }

  function openEdit(u: UserListItem) {
    setEditUser(u);
    setCreateEmail(u.email);
    setCreateFirstName(u.firstName);
    setCreateLastName(u.lastName);
    setCreateRole(u.role as "admin" | "third_party" | "back_office");
    setCreateAgencyId(u.agencyId ?? "");
    setEditStatus(u.status);
    setEditError(null);
    setCreateError(null);
  }

  function closeUserDialog() {
    setShowCreate(false);
    setEditUser(null);
    setCreateError(null);
    setEditError(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditError(null);
    if (!createFirstName.trim() || !createLastName.trim()) {
      setEditError("First name and last name are required.");
      return;
    }
    if (createRole === "third_party" && !createAgencyId) {
      setEditError("Agency is required for third-party users.");
      return;
    }
    setEditLoading(true);
    try {
      await api.users.update(editUser.id, {
        firstName: createFirstName.trim(),
        lastName: createLastName.trim(),
        role: createRole,
        agencyId: createAgencyId || null,
        status: editStatus,
      });
      api.users.list({ role: (roleFilter || undefined) as UserRole | undefined, agencyId: agencyFilter || undefined }).then(setUsers);
      closeUserDialog();
    } catch (err) {
      setEditError(getErrorMessage(err));
    } finally {
      setEditLoading(false);
    }
  }

  if (rbacLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Users</h1>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Users</h1>
        <p className="text-destructive">You do not have permission to manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Users</h1>
        <Button onClick={() => setShowCreate(true)}>Create user</Button>
      </div>

      <Dialog open={userDialogOpen} onOpenChange={(open) => !open && closeUserDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editUser ? "Edit user" : "Create user"}</DialogTitle>
          </DialogHeader>
          {editUser ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={createEmail}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="editFirstName">First name *</Label>
                  <Input
                    id="editFirstName"
                    value={createFirstName}
                    onChange={(e) => setCreateFirstName(e.target.value)}
                    required
                    disabled={editLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editLastName">Last name *</Label>
                  <Input
                    id="editLastName"
                    value={createLastName}
                    onChange={(e) => setCreateLastName(e.target.value)}
                    required
                    disabled={editLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role *</Label>
                <select
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as "admin" | "third_party" | "back_office")}
                  disabled={editLoading}
                >
                  <option value="admin">Admin</option>
                  <option value="third_party">Third party</option>
                  <option value="back_office">Back office</option>
                </select>
              </div>
              {createRole === "third_party" && (
                <div className="space-y-2">
                  <Label>Agency *</Label>
                  <select
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    value={createAgencyId}
                    onChange={(e) => setCreateAgencyId(e.target.value)}
                    required
                    disabled={editLoading}
                  >
                    <option value="">Select agency</option>
                    {agencies.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                  disabled={editLoading}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
              {editError && (
                <p className="text-sm text-destructive">{editError}</p>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={editLoading}>
                  {editLoading ? "Saving…" : "Save"}
                </Button>
                <Button type="button" variant="outline" onClick={closeUserDialog} disabled={editLoading}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="createEmail">Email *</Label>
                  <Input
                    id="createEmail"
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="createPassword">Password *</Label>
                  <Input
                    id="createPassword"
                    type="password"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="createFirstName">First name *</Label>
                  <Input
                    id="createFirstName"
                    value={createFirstName}
                    onChange={(e) => setCreateFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="createLastName">Last name *</Label>
                  <Input
                    id="createLastName"
                    value={createLastName}
                    onChange={(e) => setCreateLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role *</Label>
                <select
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as "admin" | "third_party" | "back_office")}
                >
                  <option value="admin">Admin</option>
                  <option value="third_party">Third party</option>
                  <option value="back_office">Back office</option>
                </select>
              </div>
              {createRole === "third_party" && (
                <div className="space-y-2">
                  <Label>Agency *</Label>
                  <select
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    value={createAgencyId}
                    onChange={(e) => setCreateAgencyId(e.target.value)}
                    required
                  >
                    <option value="">Select agency</option>
                    {agencies.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  {agencies.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No agencies yet. Create one from the{" "}
                      <Link href="/dashboard/agencies" className="text-primary underline-offset-2 hover:underline">
                        Agencies
                      </Link>{" "}
                      page first, then come back to create this user.
                    </p>
                  )}
                </div>
              )}
              {createError && (
                <p className="text-sm text-destructive">{createError}</p>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={createLoading}>
                  {createLoading ? "Creating…" : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={closeUserDialog}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Input
              type="search"
              placeholder="Search by name or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
            <select
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="third_party">Third party</option>
              <option value="back_office">Back office</option>
            </select>
            <select
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={agencyFilter}
              onChange={(e) => setAgencyFilter(e.target.value)}
            >
              <option value="">All agencies</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <Loading className="p-6" />
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : users.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No users found.</p>
          ) : filteredUsers.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No users match your search or filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Agency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.firstName} {u.lastName}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="capitalize">{u.role.replace("_", " ")}</TableCell>
                    <TableCell>
                      {agencies.find((a) => a.id === u.agencyId)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="capitalize">{u.status.toLowerCase()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(u)}
                      >
                        Edit
                      </Button>
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

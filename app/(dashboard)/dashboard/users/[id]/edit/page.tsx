"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
import type { UserListItem, Agency } from "@/lib/types";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Loading } from "@/components/ui/loading";

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPermission, isLoading: rbacLoading } = useRbac();
  const canManage = hasPermission(Permission.USER_MANAGE);

  const [user, setUser] = useState<UserListItem | null>(null);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"admin" | "third_party" | "back_office">("back_office");
  const [status, setStatus] = useState<"ACTIVE" | "SUSPENDED">("ACTIVE");
  const [agencyId, setAgencyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!canManage) return;
    api.users
      .get(id)
      .then((u) => {
        setUser(u);
        setFirstName(u.firstName);
        setLastName(u.lastName);
        setRole(
          u.role === "admin" || u.role === "third_party" || u.role === "back_office"
            ? u.role
            : "back_office"
        );
        setStatus(u.status);
        setAgencyId(u.agencyId ?? "");
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, canManage]);

  useEffect(() => {
    if (canManage) api.agencies.list().then(setAgencies).catch(() => {});
  }, [canManage]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaveError(null);
    if (role === "third_party" && !agencyId) {
      setSaveError("Agency is required for third-party users.");
      return;
    }
    setSaveLoading(true);
    try {
      await api.users.update(user.id, {
        firstName,
        lastName,
        role,
        status,
        agencyId: agencyId || null,
      });
      router.push("/dashboard/users");
      router.refresh();
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleDisable() {
    if (!user) return;
    if (!confirm("Disable this user? They will not be able to log in.")) return;
    setSaveError(null);
    try {
      await api.users.disable(user.id);
      router.push("/dashboard/users");
      router.refresh();
    } catch (err) {
      setSaveError(getErrorMessage(err));
    }
  }

  if (rbacLoading || (!user && loading)) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Edit user</h1>
        <Loading />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Edit user</h1>
        <p className="text-destructive">You do not have permission to manage users.</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Edit user</h1>
        <p className="text-destructive">{error ?? "User not found."}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/users">Back to users</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Edit user</h1>

      <Card>
        <CardHeader>
          <CardTitle>{user.email}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "third_party" | "back_office")}
              >
                <option value="admin">Admin</option>
                <option value="third_party">Third party</option>
                <option value="back_office">Back office</option>
              </select>
            </div>
            {role === "third_party" && (
              <div className="space-y-2">
                <Label>Agency</Label>
                <select
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={agencyId}
                  onChange={(e) => setAgencyId(e.target.value)}
                  required
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
                value={status}
                onChange={(e) => setStatus(e.target.value as "ACTIVE" | "SUSPENDED")}
              >
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={saveLoading}>
                {saveLoading ? "Saving…" : "Save changes"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/users">Cancel</Link>
              </Button>
              {status === "ACTIVE" && (
                <Button type="button" variant="destructive" onClick={handleDisable}>
                  Disable user
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

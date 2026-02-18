"use client";

import { useState, useEffect } from "react";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
import { useSession } from "@/lib/contexts/session-context";
import { useBranding } from "@/lib/contexts/branding-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { Loading } from "@/components/ui/loading";

export default function SettingsPage() {
  const { hasPermission, isLoading } = useRbac();
  const { user } = useSession();
  const { branding, refresh: refreshBranding } = useBranding();
  const canReadSettings = hasPermission(Permission.SETTINGS_READ);
  const isTenantAdmin = user?.role === "admin" && user?.organizationId != null;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSuccess, setChangeSuccess] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);

  const [brandName, setBrandName] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("");
  const [brandSecondaryColor, setBrandSecondaryColor] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [brandDisplay, setBrandDisplay] = useState<"logo" | "name" | "both">("both");
  const [brandSaveLoading, setBrandSaveLoading] = useState(false);
  const [brandSaveError, setBrandSaveError] = useState<string | null>(null);
  const [brandSaveSuccess, setBrandSaveSuccess] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    if (branding) {
      setBrandName(branding.name ?? "");
      setBrandLogoUrl(branding.logoUrl ?? "");
      setBrandPrimaryColor(branding.primaryColor ?? "");
      setBrandSecondaryColor(branding.secondaryColor ?? "");
      setBrandDescription(branding.description ?? "");
      setBrandDisplay(branding.brandingDisplay ?? "both");
    }
  }, [branding]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangeError(null);
    setChangeSuccess(false);
    if (newPassword.length < 6) {
      setChangeError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError("New passwords do not match.");
      return;
    }
    setChangeLoading(true);
    try {
      await api.auth.changePassword({
        currentPassword,
        newPassword,
      });
      setChangeSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setChangeError(getErrorMessage(err));
    } finally {
      setChangeLoading(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setLogoUploading(true);
    setBrandSaveError(null);
    try {
      const result = await api.upload.organizationLogo(file);
      setBrandLogoUrl(result.logo);
      refreshBranding();
    } catch (err) {
      setBrandSaveError(getErrorMessage(err));
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleSaveBranding(e: React.FormEvent) {
    e.preventDefault();
    setBrandSaveError(null);
    setBrandSaveSuccess(false);
    setBrandSaveLoading(true);
    try {
      await api.tenant.branding.update({
        name: brandName.trim() || undefined,
        logoUrl: brandLogoUrl.trim() || null,
        primaryColor: brandPrimaryColor.trim() || null,
        secondaryColor: brandSecondaryColor.trim() || null,
        description: brandDescription.trim() || null,
        brandingDisplay: brandDisplay,
      });
      setBrandSaveSuccess(true);
      refreshBranding();
    } catch (err) {
      setBrandSaveError(getErrorMessage(err));
    } finally {
      setBrandSaveLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <Loading />
      </div>
    );
  }

  if (!canReadSettings) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-destructive">You do not have permission to view settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Settings</h1>

      {isTenantAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Organization branding</CardTitle>
            <p className="text-sm text-muted-foreground">
              Customize your organization&apos;s name, logo, and colors on the login page and dashboard. Leave colors empty to use the default theme.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveBranding} className="max-w-md space-y-4">
              <div className="space-y-2">
                <Label>Display in sidebar, header and login</Label>
                <p className="text-xs text-muted-foreground">
                  Choose how your branding appears in the sidebar, header and login page. If you have no logo, the organization name (or platform name) is always shown.
                </p>
                <div className="flex flex-col gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="brandDisplay"
                      checked={brandDisplay === "logo"}
                      onChange={() => setBrandDisplay("logo")}
                      disabled={brandSaveLoading}
                      className="rounded-full border-input"
                    />
                    <span className="text-sm">Logo only (fall back to name if no logo)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="brandDisplay"
                      checked={brandDisplay === "name"}
                      onChange={() => setBrandDisplay("name")}
                      disabled={brandSaveLoading}
                      className="rounded-full border-input"
                    />
                    <span className="text-sm">Organization name only</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="brandDisplay"
                      checked={brandDisplay === "both"}
                      onChange={() => setBrandDisplay("both")}
                      disabled={brandSaveLoading}
                      className="rounded-full border-input"
                    />
                    <span className="text-sm">Both logo and name</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-name">Organization name</Label>
                <Input
                  id="brand-name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Support Hubs"
                  disabled={brandSaveLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-logo">Logo URL</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="brand-logo"
                    type="url"
                    value={brandLogoUrl}
                    onChange={(e) => setBrandLogoUrl(e.target.value)}
                    placeholder="https://..."
                    disabled={brandSaveLoading}
                    className="min-w-0 flex-1"
                  />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={logoUploading || brandSaveLoading}
                      onChange={handleLogoUpload}
                    />
                    <Button type="button" variant="outline" size="sm" disabled={logoUploading || brandSaveLoading} asChild>
                      <span>{logoUploading ? "Uploading…" : "Upload logo"}</span>
                    </Button>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-about">About your organization</Label>
                <textarea
                  id="brand-about"
                  value={brandDescription}
                  onChange={(e) => setBrandDescription(e.target.value)}
                  placeholder="A short description of your organisation (e.g. who you are, what you do). Shown where relevant on the platform."
                  disabled={brandSaveLoading}
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <Label>Primary color</Label>
                <p className="text-xs text-muted-foreground">Use the picker or enter a hex code (e.g. #166534).</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={/^#[0-9A-Fa-f]{6}$/.test(brandPrimaryColor) ? brandPrimaryColor : "#166534"}
                    onChange={(e) => setBrandPrimaryColor(e.target.value)}
                    disabled={brandSaveLoading}
                    className="h-10 w-14 cursor-pointer rounded border border-input bg-transparent p-0"
                    aria-label="Primary color picker"
                  />
                  <Input
                    id="brand-primary"
                    value={brandPrimaryColor}
                    onChange={(e) => setBrandPrimaryColor(e.target.value)}
                    placeholder="#166534"
                    className="font-mono max-w-[8rem]"
                    disabled={brandSaveLoading}
                  />
                  {brandPrimaryColor && (
                    <span
                      className="w-8 h-8 rounded border border-border shrink-0"
                      style={{ backgroundColor: /^#?[0-9A-Fa-f]{0,6}$/.test(brandPrimaryColor.replace(/^#/, "")) ? (brandPrimaryColor.startsWith("#") ? brandPrimaryColor : `#${brandPrimaryColor}`) : "transparent" }}
                      aria-hidden
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secondary color</Label>
                <p className="text-xs text-muted-foreground">Use the picker or enter a hex code (e.g. #dcfce7).</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={/^#[0-9A-Fa-f]{6}$/.test(brandSecondaryColor) ? brandSecondaryColor : "#dcfce7"}
                    onChange={(e) => setBrandSecondaryColor(e.target.value)}
                    disabled={brandSaveLoading}
                    className="h-10 w-14 cursor-pointer rounded border border-input bg-transparent p-0"
                    aria-label="Secondary color picker"
                  />
                  <Input
                    id="brand-secondary"
                    value={brandSecondaryColor}
                    onChange={(e) => setBrandSecondaryColor(e.target.value)}
                    placeholder="#dcfce7"
                    className="font-mono max-w-[8rem]"
                    disabled={brandSaveLoading}
                  />
                  {brandSecondaryColor && /^#?[0-9A-Fa-f]{6}$/.test(brandSecondaryColor.replace(/^#/, "")) && (
                    <span
                      className="w-8 h-8 rounded border border-border shrink-0"
                      style={{ backgroundColor: brandSecondaryColor.startsWith("#") ? brandSecondaryColor : `#${brandSecondaryColor}` }}
                      aria-hidden
                    />
                  )}
                </div>
              </div>
              {brandSaveError && (
                <p className="text-sm text-destructive" role="alert">{brandSaveError}</p>
              )}
              {brandSaveSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400" role="status">
                  Branding updated. Changes apply across the app.
                </p>
              )}
              <Button type="submit" disabled={brandSaveLoading}>
                {brandSaveLoading ? "Saving…" : "Save branding"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <p className="text-sm text-muted-foreground">
            Update your account password. Use at least 6 characters.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="max-w-sm space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={changeLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={changeLoading}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={changeLoading}
                minLength={6}
              />
            </div>
            {changeError && (
              <p className="text-sm text-destructive" role="alert">
                {changeError}
              </p>
            )}
            {changeSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400" role="status">
                Your password has been updated.
              </p>
            )}
            <Button type="submit" disabled={changeLoading}>
              {changeLoading ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System settings</CardTitle>
          <p className="text-sm text-muted-foreground">
            Application configuration. Additional options may be added here.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">App name</p>
            <p className="text-foreground">Support Hubs</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Maintenance mode</p>
            <p className="text-foreground">Off</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Loading } from "@/components/ui/loading";

function JoinFormInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [validating, setValidating] = useState(!!token);
  const [valid, setValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [subdomainSlug, setSubdomainSlug] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setValid(false);
      setError("Missing invitation token. Check your email for the invitation link.");
      return;
    }
    api.join
      .validate(token)
      .then((data) => {
        setValid(true);
        setOrganizationName(data.organizationName);
        setSubdomainSlug(data.subdomainSlug);
        setAdminEmail(data.email);
      })
      .catch((err) => {
        setValid(false);
        setError(getErrorMessage(err));
      })
      .finally(() => setValidating(false));
  }, [token]);

  function handleSlugChange(value: string) {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/^-|-$/g, "");
    setSubdomainSlug(slug);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    e.target.value = "";
    setLogoUploadError(null);
    setLogoUploading(true);
    try {
      const result = await api.join.uploadLogo(token, file);
      setLogoUrl(result.logoUrl);
    } catch (err) {
      setLogoUploadError(getErrorMessage(err));
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !valid) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { redirectUrl } = await api.join.submit({
        token,
        organizationName: organizationName.trim(),
        subdomainSlug: subdomainSlug.trim().toLowerCase(),
        adminEmail: adminEmail.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        logoUrl: logoUrl.trim() || undefined,
        primaryColor: primaryColor.trim() || undefined,
        secondaryColor: secondaryColor.trim() || undefined,
        createAsActive: true,
      });
      window.location.assign(redirectUrl);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (validating) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!valid || !token) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Invalid invitation</CardTitle>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/">Go to home</Link>
              </Button>
            </CardContent>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Set up your organization</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete the form below to create your organization and admin account.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Organization &amp; admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization name</Label>
              <Input
                id="organizationName"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Acme Food Bank"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subdomainSlug">Subdomain</Label>
              <Input
                id="subdomainSlug"
                value={subdomainSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="acme-food-bank"
                className="font-mono"
                required
              />
              <p className="text-xs text-muted-foreground">
                Your dashboard will be at: {subdomainSlug || "slug"}.supporthubs.org
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin email</Label>
              <Input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </div>
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <p className="text-xs text-muted-foreground">At least 6 characters</p>
            </div>
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Optional: branding (logo &amp; colours)
              </summary>
              <div className="mt-3 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo</Label>
                  <p className="text-xs text-muted-foreground">
                    Paste a logo URL or upload an image (max 5MB).
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      id="logoUrl"
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://... or upload below"
                      className="min-w-0 flex-1"
                    />
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={logoUploading || submitting}
                        onChange={handleLogoUpload}
                      />
                      <Button type="button" variant="outline" size="sm" disabled={logoUploading || submitting} asChild>
                        <span>{logoUploading ? "Uploading…" : "Upload logo"}</span>
                      </Button>
                    </label>
                  </div>
                  {logoUploadError && (
                    <p className="text-sm text-destructive">{logoUploadError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Primary colour</Label>
                  <p className="text-xs text-muted-foreground">
                    Use the picker or enter a hex code (e.g. #0066cc).
                  </p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={/^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : "#0066cc"}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      disabled={submitting}
                      className="h-10 w-14 cursor-pointer rounded border border-input bg-transparent p-0"
                      aria-label="Primary colour picker"
                    />
                    <Input
                      id="primaryColor"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#0066cc"
                      className="font-mono max-w-[8rem]"
                      disabled={submitting}
                    />
                    {primaryColor && /^#?[0-9A-Fa-f]{0,6}$/.test(primaryColor.replace(/^#/, "")) && (
                      <span
                        className="w-8 h-8 rounded border border-border shrink-0"
                        style={{
                          backgroundColor: primaryColor.startsWith("#") ? primaryColor : `#${primaryColor}`,
                        }}
                        aria-hidden
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secondary colour</Label>
                  <p className="text-xs text-muted-foreground">
                    Use the picker or enter a hex code (e.g. #004499).
                  </p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={/^#[0-9A-Fa-f]{6}$/.test(secondaryColor) ? secondaryColor : "#004499"}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      disabled={submitting}
                      className="h-10 w-14 cursor-pointer rounded border border-input bg-transparent p-0"
                      aria-label="Secondary colour picker"
                    />
                    <Input
                      id="secondaryColor"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#004499"
                      className="font-mono max-w-[8rem]"
                      disabled={submitting}
                    />
                    {secondaryColor && /^#?[0-9A-Fa-f]{0,6}$/.test(secondaryColor.replace(/^#/, "")) && (
                      <span
                        className="w-8 h-8 rounded border border-border shrink-0"
                        style={{
                          backgroundColor: secondaryColor.startsWith("#") ? secondaryColor : `#${secondaryColor}`,
                        }}
                        aria-hidden
                      />
                    )}
                  </div>
                </div>
              </div>
            </details>
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating…" : "Create organization and account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-12">
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loading />
          </div>
        }
      >
        <JoinFormInner />
      </Suspense>
    </div>
  );
}

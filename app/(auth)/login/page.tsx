"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { getTenantLoginUrl } from "@/lib/tenant-urls";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";

const RESERVED = new Set(["www", "app", "api", "admin", "platform", "mail"]);

function safeCallbackUrl(callbackUrl: string | null): string | null {
  if (!callbackUrl || typeof callbackUrl !== "string") return null;
  const trimmed = callbackUrl.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  return null;
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get("tenant")?.trim();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

  useEffect(() => {
    if (!tenantSlug || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(tenantSlug) || RESERVED.has(tenantSlug)) return;
    const hostname = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
    const isRootLocalhost = hostname === "localhost" || hostname.startsWith("127.");
    const isOnTenantSubdomain = hostname === `${tenantSlug}.localhost` || hostname.endsWith(`.${tenantSlug}.localhost`);
    if (isRootLocalhost && !isOnTenantSubdomain) {
      const url = getTenantLoginUrl(tenantSlug);
      const full = callbackUrl ? `${url}?callbackUrl=${encodeURIComponent(callbackUrl)}` : url;
      window.location.replace(full);
    }
  }, [tenantSlug, callbackUrl]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      await api.auth.login({ email: trimmedEmail, password });
      const target = callbackUrl ?? "/dashboard";
      window.location.assign(target);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">Log in</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Sign in to access the dashboard.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}

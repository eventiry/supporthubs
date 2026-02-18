"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Loading } from "@/components/ui/loading";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const missingToken = !token.trim();

  useEffect(() => {
    if (missingToken) setError("Reset link is missing. Please request a new one.");
  }, [missingToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (missingToken) return;
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.auth.resetPassword({ token, newPassword: password });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (missingToken) {
    return (
      <div className="w-full rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Invalid reset link</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This link is missing the reset token. Please use the link from your
          email or request a new one.
        </p>
        <Button asChild className="mt-4 w-full">
          <Link href="/forgot-password">Request new link</Link>
        </Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Password reset</h2>
        <p className="mt-2 text-sm text-foreground" role="status">
          Your password has been reset. Redirecting you to sign in…
        </p>
        <Button asChild className="mt-4 w-full">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">Set new password</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your new password below. Use at least 6 characters.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            minLength={6}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            minLength={6}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Resetting…" : "Reset password"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="text-primary underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center rounded-xl border border-border bg-card p-8 shadow-sm">
          <Loading />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

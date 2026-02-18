"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useRbac } from "@/lib/hooks/use-rbac";
import type { Permission } from "@/lib/rbac/permissions";

type RbacRouteGuardProps = {
  children: React.ReactNode;
  /** Require at least one of these permissions. */
  permissions: Permission[];
  /** If no permission, redirect here. Default /dashboard. */
  redirectTo?: string;
  /** If true, show "Forbidden" instead of redirecting. */
  showForbidden?: boolean;
};

/**
 * Protects content by permission. Redirects to redirectTo (default /dashboard) or shows "Forbidden" if the user lacks all of the given permissions.
 */
export function RbacRouteGuard({
  children,
  permissions,
  redirectTo = "/dashboard",
  showForbidden = false,
}: RbacRouteGuardProps) {
  const router = useRouter();
  const { hasPermission, isLoading } = useRbac();

  const allowed = permissions.some((p) => hasPermission(p));

  useEffect(() => {
    if (isLoading) return;
    if (!allowed && !showForbidden) {
      router.replace(redirectTo);
    }
  }, [allowed, isLoading, redirectTo, showForbidden, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        Loading…
      </div>
    );
  }

  if (!allowed) {
    if (showForbidden) {
      return (
        <div className="p-6 text-center">
          <h2 className="text-lg font-semibold text-red-600">Forbidden</h2>
          <p className="mt-2 text-sm text-gray-600">
            You do not have permission to view this page.
          </p>
        </div>
      );
    }
    return null;
  }

  return <>{children}</>;
}

"use client";

import { useCallback, useMemo } from "react";
import { useSession } from "@/lib/contexts/session-context";
import {
  Permission,
  getPermissionsForRole,
} from "@/lib/rbac/permissions";

export type { Permission };

export function useRbac(): {
  hasPermission: (permission: Permission) => boolean;
  role: ReturnType<typeof useSession>["role"];
  user: ReturnType<typeof useSession>["user"];
  isLoading: boolean;
} {
  const { user, role, isLoading } = useSession();

  const permissions = useMemo(() => {
    const base = role ? getPermissionsForRole(role) : [];
    // super_admin gets platform permissions from getPermissionsForRole; keep backward compat for organizationId === null
    if (base.includes(Permission.ORGANIZATION_VIEW)) return base;
    if (user?.organizationId === null) {
      return [...base, Permission.ORGANIZATION_VIEW];
    }
    return base;
  }, [role, user?.organizationId]);

  const hasPermission = useCallback(
    (permission: Permission): boolean => permissions.includes(permission),
    [permissions]
  );

  return {
    hasPermission,
    role,
    user,
    isLoading,
  };
}

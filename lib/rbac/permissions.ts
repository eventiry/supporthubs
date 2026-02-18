/**
 * RBAC: Permission enum and role-to-permissions mapping.
 */

import type { UserRole } from "@/lib/types";

/** Display labels for roles (UI only). */
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  third_party: "Third party",
  back_office: "Back office",
};

export function getRoleDisplayLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role.replace(/_/g, " ");
}

export enum Permission {
  DASHBOARD_READ = "DASHBOARD_READ",
  CLIENT_READ = "CLIENT_READ",
  CLIENT_CREATE = "CLIENT_CREATE",
  CLIENT_UPDATE = "CLIENT_UPDATE",
  VOUCHER_ISSUE = "VOUCHER_ISSUE",
  VOUCHER_VIEW_OWN = "VOUCHER_VIEW_OWN",
  VOUCHER_VIEW_ALL = "VOUCHER_VIEW_ALL",
  VOUCHER_REDEEM = "VOUCHER_REDEEM",
  REPORTS_READ = "REPORTS_READ",
  USER_MANAGE = "USER_MANAGE",
  SETTINGS_READ = "SETTINGS_READ",
  AUDIT_VIEW = "AUDIT_VIEW",
  /** Platform-only: manage organizations (Phase 2). Granted only to platform admins (organizationId === null). */
  ORGANIZATION_VIEW = "ORGANIZATION_VIEW",
}

/** Platform-only permission (organizations, invitations, plans, contact enquiries). Only super_admin. */
const PLATFORM_PERMISSIONS: Permission[] = [Permission.ORGANIZATION_VIEW];

/** All permissions available to tenant roles (admin gets these). Platform-only permissions are separate. */
const TENANT_PERMISSIONS: Permission[] = (
  Object.values(Permission) as Permission[]
).filter((p) => p !== Permission.ORGANIZATION_VIEW);

const THIRD_PARTY_PERMISSIONS: Permission[] = [
  Permission.DASHBOARD_READ,
  Permission.CLIENT_READ,
  Permission.CLIENT_CREATE,
  Permission.CLIENT_UPDATE,
  Permission.VOUCHER_ISSUE,
  Permission.VOUCHER_VIEW_OWN,
];

const BACK_OFFICE_PERMISSIONS: Permission[] = [
  Permission.DASHBOARD_READ,
  Permission.CLIENT_READ,
  Permission.VOUCHER_VIEW_OWN,
  Permission.VOUCHER_VIEW_ALL,
  Permission.VOUCHER_REDEEM,
];

/**
 * Returns the list of permissions for a given role.
 * super_admin: platform only (ORGANIZATION_VIEW). admin: all tenant; third_party/back_office: subset.
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  switch (role) {
    case "super_admin":
      return [...PLATFORM_PERMISSIONS];
    case "admin":
      return [...TENANT_PERMISSIONS];
    case "third_party":
      return THIRD_PARTY_PERMISSIONS;
    case "back_office":
      return BACK_OFFICE_PERMISSIONS;
    default:
      return [];
  }
}

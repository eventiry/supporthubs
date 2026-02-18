"use client";

import Link from "next/link";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Loading } from "@/components/ui/loading";
import {
  LayoutDashboard,
  Users,
  Ticket,
  Receipt,
  Building2,
  MapPin,
  UserCog,
  BarChart3,
  Settings,
  ArrowRight,
} from "lucide-react";

const QUICK_ACTIONS: {
  href: string;
  label: string;
  description: string;
  permission: Permission;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { href: "/dashboard/clients", label: "Clients", description: "Search and manage client records", permission: Permission.CLIENT_READ, icon: Users },
  { href: "/dashboard/vouchers/issue", label: "Issue voucher", description: "Issue a new e-voucher for a client", permission: Permission.VOUCHER_ISSUE, icon: Ticket },
  { href: "/dashboard/redeem", label: "Redeem voucher", description: "Redeem a voucher at the food bank", permission: Permission.VOUCHER_REDEEM, icon: Receipt },
  { href: "/dashboard/agencies", label: "Agencies", description: "Manage referral agencies", permission: Permission.USER_MANAGE, icon: Building2 },
  { href: "/dashboard/centers", label: "Food bank centres", description: "Manage food bank locations", permission: Permission.USER_MANAGE, icon: MapPin },
  { href: "/dashboard/users", label: "Users", description: "Manage user accounts and roles", permission: Permission.USER_MANAGE, icon: UserCog },
  { href: "/dashboard/reports", label: "Reports", description: "View analytics and reports", permission: Permission.REPORTS_READ, icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", description: "System configuration", permission: Permission.SETTINGS_READ, icon: Settings },
];

export default function DashboardPage() {
  const { hasPermission, isLoading } = useRbac();

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loading />
      </div>
    );
  }

  const allowedActions = QUICK_ACTIONS.filter((action) =>
    hasPermission(action.permission)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back. Choose an action below or use the sidebar to navigate.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            Quick actions
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Shortcuts based on your access level.
          </p>
        </CardHeader>
        <CardContent>
          {allowedActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You do not have access to any dashboard actions. Contact an
              administrator if this is unexpected.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {allowedActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href}>
                    <Card className="h-full transition-colors hover:bg-muted/50">
                      <CardContent className="flex flex-col p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5 shrink-0 text-primary" />
                            <span className="font-medium text-foreground">
                              {action.label}
                            </span>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {action.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

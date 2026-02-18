"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  Users,
  Ticket,
  Receipt,
  BarChart3,
  Building2,
  MapPin,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Globe,
  CreditCard,
  ListOrdered,
  Mail,
  Banknote,
  Briefcase,
} from "lucide-react";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { useBranding, getBrandingDisplay, getBrandingInitials } from "@/lib/contexts/branding-context";
import { cn } from "@/lib/utils";
import { LoadingSkeleton } from "@/components/ui/loading";

const NAV_ITEMS: {
  href: string;
  label: string;
  permission: Permission;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { href: "/dashboard", label: "Dashboard", permission: Permission.DASHBOARD_READ, icon: LayoutDashboard },
  { href: "/dashboard/clients", label: "Clients", permission: Permission.CLIENT_READ, icon: Users },
  { href: "/dashboard/vouchers", label: "Vouchers", permission: Permission.VOUCHER_VIEW_OWN, icon: ClipboardList },
  { href: "/dashboard/vouchers/issue", label: "Issue voucher", permission: Permission.VOUCHER_ISSUE, icon: Ticket },
  { href: "/dashboard/redeem", label: "Redeem voucher", permission: Permission.VOUCHER_REDEEM, icon: Receipt },
  { href: "/dashboard/agencies", label: "Agencies", permission: Permission.USER_MANAGE, icon: Building2 },
  { href: "/dashboard/centers", label: "Food bank centres", permission: Permission.USER_MANAGE, icon: MapPin },
  { href: "/dashboard/users", label: "Users", permission: Permission.USER_MANAGE, icon: UserCog },
  { href: "/dashboard/reports", label: "Reports", permission: Permission.REPORTS_READ, icon: BarChart3 },
  { href: "/dashboard/billing", label: "Billing", permission: Permission.SETTINGS_READ, icon: Banknote },
  { href: "/dashboard/settings", label: "Settings", permission: Permission.SETTINGS_READ, icon: Settings },
  { href: "/dashboard/platform/organizations", label: "Organizations", permission: Permission.ORGANIZATION_VIEW, icon: Briefcase },
  { href: "/dashboard/platform/invitations", label: "Invitations", permission: Permission.ORGANIZATION_VIEW, icon: Globe },
  { href: "/dashboard/platform/plans", label: "Subscription Plans", permission: Permission.ORGANIZATION_VIEW, icon: CreditCard },
  { href: "/dashboard/platform/subscriptions", label: "Subscriptions", permission: Permission.ORGANIZATION_VIEW, icon: ListOrdered },
  { href: "/dashboard/platform/contact", label: "Contact enquiries", permission: Permission.ORGANIZATION_VIEW, icon: Mail },
];

function NavItems({
  onItemClick,
  isCollapsed,
}: {
  onItemClick?: () => void;
  isCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const { hasPermission, isLoading, user } = useRbac();

  const visibleItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (!hasPermission(item.permission)) return false;
        // Billing is for organizations only; hide for platform admins (no org)
        if (item.href === "/dashboard/billing" && user?.organizationId == null) return false;
        return true;
      }),
    [hasPermission, user?.organizationId]
  );

  if (isLoading) {
    return (
      <nav className="space-y-1 px-2 py-4">
        <div className="h-8 animate-pulse rounded bg-muted" />
        <div className="h-8 animate-pulse rounded bg-muted" />
        <div className="h-8 animate-pulse rounded bg-muted" />
      </nav>
    );
  }

  return (
    <nav className="space-y-1 px-2 py-4">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        let isActive: boolean;
        if (item.href === "/dashboard") {
          isActive = pathname === "/dashboard";
        } else if (item.href === "/dashboard/vouchers") {
          // Vouchers list or voucher detail [id], but not issue flow
          isActive =
            pathname === "/dashboard/vouchers" ||
            (pathname.startsWith("/dashboard/vouchers/") &&
              !pathname.startsWith("/dashboard/vouchers/issue"));
        } else if (item.href === "/dashboard/vouchers/issue") {
          isActive = pathname.startsWith("/dashboard/vouchers/issue");
        } else if (item.href.startsWith("/dashboard/platform")) {
          isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        } else {
          isActive = pathname.startsWith(item.href);
        }

        const linkContent = (
          <Link
            href={item.href}
            prefetch={item.href === "/dashboard" ? false : undefined}
            onClick={onItemClick}
            title={isCollapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive 
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent",
              isCollapsed && "justify-center px-2"
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" aria-hidden />
            {!isCollapsed && <span>{item.label}</span>}
          </Link>
        );
        return <div key={item.href}>{linkContent}</div>;
      })}
    </nav>
  );
}

const SIDEBAR_WIDTH_EXPANDED = 256; // w-64 = 16rem
const SIDEBAR_WIDTH_COLLAPSED = 64;  // w-16

export const SIDEBAR_COLLAPSED_KEY = "mfb-sidebar-collapsed";

interface SidebarProps {
  variant?: "default" | "mobile";
  onItemClick?: () => void;
}

export function Sidebar({ variant = "default", onItemClick }: SidebarProps) {
  const isMobile = useIsMobile();
  const { branding, isLoading: brandingLoading } = useBranding();
  const { showLogo, showName, displayName } = getBrandingDisplay(branding);
  const logoUrl = branding?.logoUrl?.trim();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved !== null) {
      try {
        setIsCollapsed(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(isCollapsed));
    window.dispatchEvent(new CustomEvent("sidebar-toggle"));
  }, [isCollapsed, isMounted]);

  // On mobile, desktop sidebar is hidden (header shows menu that opens drawer)
  if (isMobile && variant === "default") {
    return null;
  }

  // Mobile variant: used inside the mobile drawer
  if (variant === "mobile") {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {/* <div className="border-b p-4 bg-primary text-primary-foreground" >
          <Link href="/dashboard" prefetch={false} onClick={onItemClick} className="font-semibold text-foreground">
            Support Hubs
          </Link>
        </div> */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          <NavItems onItemClick={onItemClick} />
        </div>
      </div>
    );
  }



  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-border bg-background transition-[width] duration-300 md:flex",
        isCollapsed ? "w-16" : "w-64"
      )}
      aria-label="Main navigation"
    >
      <Link
        href="/dashboard"
        prefetch={false}
        className={cn(
          "flex h-14 items-center border-b border-border px-3 bg-primary text-primary-foreground",
          isCollapsed ? "justify-center" : "justify-start gap-2"
        )}
      >
        {brandingLoading ? (
          <>
            {!isCollapsed && (
              <>
                <span className="h-8 w-8 animate-pulse rounded bg-primary-foreground/20" aria-hidden />
                <span className="h-5 w-28 flex-1 max-w-[140px] animate-pulse rounded bg-primary-foreground/20" aria-hidden />
              </>
            )}
            {isCollapsed && <span className="h-6 w-6 animate-pulse rounded bg-primary-foreground/20" aria-hidden />}
          </>
        ) : (
          <>
            {showLogo && logoUrl && (isCollapsed ? (
              <img src={logoUrl} alt="" className="h-8 w-8 object-contain object-center" aria-label={displayName} />
            ) : (
              <img src={logoUrl} alt="" className="h-8 w-auto max-h-8 object-contain" />
            ))}
            {showName && !isCollapsed && (
              <span className="font-semibold text-primary-foreground truncate">{displayName}</span>
            )}
            {isCollapsed && !(showLogo && logoUrl) && (
              <span className="text-lg font-semibold text-primary-foreground" aria-label={displayName}>
                {getBrandingInitials(displayName)}
              </span>
            )}
          </>
        )}
      </Link>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {isMounted && <NavItems isCollapsed={isCollapsed} />}
      </div>
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow transition-colors hover:bg-accent"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" aria-hidden />
        ) : (
          <ChevronLeft className="h-4 w-4" aria-hidden />
        )}
      </button>
    </aside>
  );
}

export { SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED };

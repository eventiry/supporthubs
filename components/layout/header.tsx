"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/contexts/session-context";
import { useBranding, getBrandingDisplay } from "@/lib/contexts/branding-context";
import { Button } from "@/components/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/alert-dialog";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";
import { SIDEBAR_COLLAPSED_KEY } from "./sidebar";

export function Header() {
  const router = useRouter();
  const { user, isLoading } = useSession();
  const { branding, isLoading: brandingLoading } = useBranding();
  const { showLogo, showName, displayName } = getBrandingDisplay(branding);
  const logoUrl = branding?.logoUrl?.trim();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved !== null) {
      try {
        setSidebarCollapsed(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
    const handleSidebarToggle = () => {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (saved !== null) {
        try {
          setSidebarCollapsed(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("sidebar-toggle", handleSidebarToggle);
    return () => window.removeEventListener("sidebar-toggle", handleSidebarToggle);
  }, []);

  async function handleLogout() {
      await api.auth.logout();
      router.push("/login");
      router.refresh();
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border bg-primary text-primary-foreground px-3 transition-[left] duration-300 sm:px-4",
          isMounted ? (sidebarCollapsed ? "md:left-16" : "md:left-64") : "md:left-64"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </Button>
          <Link
            href="/dashboard"
            prefetch={false}
            className="flex items-center gap-2 truncate font-semibold text-primary-foreground md:min-w-0 md:hidden"
          >
            {brandingLoading ? (
              <>
                <span className="h-7 w-16 animate-pulse rounded bg-primary-foreground/20 shrink-0" aria-hidden />
                <span className="h-5 w-24 animate-pulse rounded bg-primary-foreground/20" aria-hidden />
              </>
            ) : (
              <>
                {showLogo && logoUrl && <img src={logoUrl} alt="" className="h-7 w-auto max-h-7 object-contain shrink-0" />}
                {showName && <span className="truncate">{displayName}</span>}
              </>
            )}
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          {!isLoading && user && (
            <>
              <span className="hidden max-w-[120px] truncate text-sm text-primary-foreground sm:max-w-[180px] sm:inline">
               Hello {user.firstName}
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="secondary" className="text-sm p-0 h-auto shrink-0">
                    Log out
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Log out</AlertDialogTitle>
                    <AlertDialogDescription>Are you sure you want to log out?</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout}>Log out</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </header>

      {/* Mobile menu overlay + drawer */}
      <div
        className={cn(
          "fixed inset-0 z-[100] bg-black/50 transition-opacity duration-200 md:hidden",
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden
        onClick={closeMobileMenu}
      />
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-[101] w-[min(100vw-4rem,280px)] max-w-[280px] border-r border-border bg-background shadow-lg transition-transform duration-200 ease-out md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-label="Main navigation"
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-3 bg-primary text-primary-foreground">
          <div className="flex items-center gap-2 border-b p-4 bg-primary text-primary-foreground">
            <Link href="/dashboard" prefetch={false} onClick={closeMobileMenu} className="flex items-center gap-2 font-semibold text-primary-foreground">
              {showLogo && logoUrl && <img src={logoUrl} alt="" className="h-7 w-auto max-h-7 object-contain" />}
              {showName && <span>{displayName}</span>}
            </Link>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={closeMobileMenu}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden />
          </Button>
        </div>
        <div className="h-[calc(100vh-3.5rem)] overflow-hidden">
          <Sidebar variant="mobile" onItemClick={closeMobileMenu} />
        </div>
      </div>
    </>
  );
}

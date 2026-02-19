"use client";

import { useState } from "react";
import Link from "next/link";
import { useBranding, getBrandingDisplay } from "@/lib/contexts/branding-context";
import { Sheet, SheetContent, SheetTrigger } from "@/components/sheet";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/benefits", label: "Benefits" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export function PublicNav() {
  const { branding, isLoading: brandingLoading } = useBranding();
  const { showLogo, showName, displayName } = getBrandingDisplay(branding);
  const logoUrl = branding?.logoUrl?.trim();
  const hasBrandColor = !!branding?.primaryColor;
  const [open, setOpen] = useState(false);
const  onSingleTenantMode = process.env.NEXT_PUBLIC_SINGLE_TENANT_MODE === "true";
  const linkClass = hasBrandColor
    ? "text-primary-foreground/90 hover:text-primary-foreground hover:bg-white/10"
    : "text-foreground hover:text-primary";

  if (onSingleTenantMode) {
    return null;
  }
  return (
    <nav
      className={cn(
        "sticky top-0 z-40 w-full border-b backdrop-blur supports-[backdrop-filter]:backdrop-blur-md",
        !brandingLoading && hasBrandColor
          ? "bg-primary border-primary/20 text-primary-foreground"
          : "bg-background/95 border-border supports-[backdrop-filter]:bg-background/80"
      )}
      aria-label="Main"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-2 no-underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md"
        >
          {brandingLoading ? (
            <>
              <span className="h-8 w-20 animate-pulse rounded bg-muted" aria-hidden />
              <span className="h-5 w-32 animate-pulse rounded bg-muted" aria-hidden />
            </>
          ) : (
            <>
              {showLogo && logoUrl && (
                <img
                  src={logoUrl}
                  alt=""
                  className="h-8 w-auto max-h-8 object-contain"
                />
              )}
              {showName && (
                <span
                  className={cn(
                    "truncate font-semibold",
                    hasBrandColor ? "text-primary-foreground" : "text-foreground"
                  )}
                >
                  {displayName}
                </span>
              )}
            </>
          )}
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                linkClass
              )}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/login"
            className={cn(
              "ml-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              hasBrandColor
                ? "bg-white/20 text-primary-foreground hover:bg-white/30"
                : "text-primary hover:underline underline-offset-2"
            )}
          >
            Log in
          </Link>
        </div>

        {/* Mobile menu */}
        <div className="flex md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                hasBrandColor
                  ? "text-primary-foreground hover:bg-white/10"
                  : "text-foreground hover:bg-muted"
              )}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100vw-2rem,320px)]">
              <div className="flex flex-col gap-1 pt-8">
                {LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-3 text-base font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    {label}
                  </Link>
                ))}
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="mt-4 rounded-md px-3 py-3 text-base font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  Log in
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

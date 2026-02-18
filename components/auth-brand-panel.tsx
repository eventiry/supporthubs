"use client";

import Link from "next/link";
import { useBranding, getBrandingDisplay } from "@/lib/contexts/branding-context";

const DEFAULT_TAGLINE = "Voucher and client management for food bank partners.";

export function AuthBrandPanel() {
  const { branding, isLoading } = useBranding();
  const { showLogo, showName, displayName } = getBrandingDisplay(branding);
  const logoUrl = branding?.logoUrl?.trim();

  return (
    <aside className="flex flex-col px-6 py-10 md:w-[min(48%,420px)] md:px-12 md:py-16 lg:px-16 md:min-h-0 bg-primary text-primary-foreground">
      <div className="flex flex-1 flex-col justify-center md:justify-center">
        <Link
          href="/"
          className="focus:outline-none focus:ring-2 focus:ring-primary-foreground/50 rounded-md flex items-center gap-3"
        >
          {isLoading ? (
            <>
              <span className="h-10 w-24 animate-pulse rounded bg-primary-foreground/20" aria-hidden />
              <span className="h-8 w-48 max-w-[200px] animate-pulse rounded bg-primary-foreground/20" aria-hidden />
            </>
          ) : (
            <>
              {showLogo && logoUrl && (
                <img
                  src={logoUrl}
                  alt=""
                  className="h-10 w-auto max-w-[180px] object-contain object-left"
                />
              )}
              {showName && (
                <span className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                  {displayName}
                </span>
              )}
            </>
          )}
        </Link>
        <p className="mt-3 text-sm opacity-95 sm:text-base lg:mt-4 lg:text-lg max-w-xs">
          {DEFAULT_TAGLINE}
        </p>
        <div className="mt-8 hidden md:block h-px w-16 bg-primary-foreground/30 rounded-full" aria-hidden />
      </div>
      <div className="hidden md:block mt-auto pt-8 text-primary-foreground/80 text-sm">
        <p>
          Powered by{" "}
          <Link href="https://ordafy.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary-foreground transition-colors underline underline-offset-2">
            Ordafy
          </Link>
        </p>
      </div>
    </aside>
  );
}

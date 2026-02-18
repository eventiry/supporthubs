"use client";

import Link from "next/link";
import { useBranding, getBrandingDisplay } from "@/lib/contexts/branding-context";
import { cn } from "@/lib/utils";

const FOOTER_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/benefits", label: "Benefits" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

const LEGAL_LINKS = [
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/cookies", label: "Cookies" },
] as const;

export function PublicFooter() {
  const { branding, isLoading: brandingLoading } = useBranding();
  const { showLogo, showName, displayName } = getBrandingDisplay(branding);
  const logoUrl = branding?.logoUrl?.trim();
  const hasBrandColor = !!branding?.primaryColor;

  return (
    <footer
      className={cn(
        "flex-shrink-0 border-t py-8 sm:py-10",
        !brandingLoading && hasBrandColor
          ? "border-primary/20 bg-primary/5"
          : "border-border bg-muted/30"
      )}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Brand + main links */}
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:items-start sm:text-left">
          <Link
            href="/"
            className="flex flex-col items-center gap-2 no-underline sm:flex-row sm:gap-3"
          >
            {brandingLoading ? (
              <>
                <span className="h-9 w-24 animate-pulse rounded bg-muted" aria-hidden />
                <span className="h-5 w-28 animate-pulse rounded bg-muted" aria-hidden />
              </>
            ) : (
              <>
                {showLogo && logoUrl && (
                  <img
                    src={logoUrl}
                    alt=""
                    className="h-9 w-auto max-h-9 object-contain"
                  />
                )}
                {showName && (
                  <span
                    className={cn(
                      "font-semibold",
                      hasBrandColor ? "text-primary" : "text-foreground"
                    )}
                  >
                    {displayName}
                  </span>
                )}
              </>
            )}
          </Link>
          <nav
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:justify-end"
            aria-label="Footer"
          >
            {FOOTER_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Legal + powered by */}
        <div className="mt-6 pt-6 border-t border-border flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-center sm:gap-6 sm:flex-wrap">
          {LEGAL_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              {label}
            </Link>
          ))}
          <span className="hidden sm:inline text-border" aria-hidden>
            |
          </span>
          <p className="text-sm text-muted-foreground">
            Powered by{" "}
            <Link
              href="https://ordafy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary transition-colors hover:underline underline-offset-2"
            >
              Ordafy
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

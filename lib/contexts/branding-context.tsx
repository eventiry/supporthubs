"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { api } from "@/lib/api";
import { hexToHslString } from "@/lib/utils";

export type BrandingDisplay = "logo" | "name" | "both";

export interface TenantBranding {
  name: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  description: string | null;
  brandingDisplay: BrandingDisplay;
}

type BrandingContextValue = {
  branding: TenantBranding | null;
  isLoading: boolean;
  refresh: () => void;
};

const defaultBranding: TenantBranding = {
  name: null,
  logoUrl: null,
  primaryColor: null,
  secondaryColor: null,
  description: null,
  brandingDisplay: "both",
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBranding = useCallback(async () => {
    try {
      const data = await api.tenant.branding.get();
      setBranding(data ?? defaultBranding);
    } catch {
      setBranding(defaultBranding);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const value: BrandingContextValue = {
    branding: branding ?? defaultBranding,
    isLoading,
    refresh: () => {
      setIsLoading(true);
      fetchBranding();
    },
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
      {!isLoading && branding && (branding.primaryColor || branding.secondaryColor) && (
        <BrandingStyles
          primaryColor={branding.primaryColor}
          secondaryColor={branding.secondaryColor}
        />
      )}
    </BrandingContext.Provider>
  );
}

/**
 * Gate: do not render children until branding has loaded.
 * Shows a neutral full-page loading state (no platform green) until GET /api/tenant/branding completes.
 * Use at the root so the app never flashes platform theme before tenant branding is known.
 */
export function BrandingGate({ children }: { children: React.ReactNode }) {
  const { isLoading } = useBranding();

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-muted"
        role="status"
        aria-label="Loading"
      >
        <div
          className="h-10 w-10 shrink-0 rounded-full border-2 border-t-2"
          style={{
            borderColor: "rgb(229 231 235)", // gray-200
            borderTopColor: "rgb(75 85 99)", // gray-600
            animation: "branding-gate-spin 0.7s linear infinite",
          }}
          aria-hidden
        />
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Injects CSS variables for tenant primary/secondary onto the document.
 * Tailwind uses --primary and --secondary as "H S% L%".
 */
function BrandingStyles({
  primaryColor,
  secondaryColor,
}: {
  primaryColor: string | null;
  secondaryColor: string | null;
}) {
  useEffect(() => {
    const root = document.documentElement;
    const primaryHsl = primaryColor ? hexToHslString(primaryColor) : null;
    const secondaryHsl = secondaryColor ? hexToHslString(secondaryColor) : null;
    if (primaryHsl) root.style.setProperty("--primary", primaryHsl);
    if (secondaryHsl) root.style.setProperty("--secondary", secondaryHsl);
    return () => {
      if (primaryHsl) root.style.removeProperty("--primary");
      if (secondaryHsl) root.style.removeProperty("--secondary");
    };
  }, [primaryColor, secondaryColor]);
  return null;
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (ctx == null) {
    return {
      branding: defaultBranding,
      isLoading: true,
      refresh: () => {},
    };
  }
  return ctx;
}

const DEFAULT_APP_NAME = "Support Hubs";

/**
 * Resolve what to show in sidebar, header and login based on branding and preference.
 * When there is no logo, we always fall back to showing the organization/platform name.
 */
export function getBrandingDisplay(
  branding: TenantBranding | null,
  defaultName: string = DEFAULT_APP_NAME
): { showLogo: boolean; showName: boolean; displayName: string } {
  const name = branding?.name?.trim() || defaultName;
  const logoUrl = branding?.logoUrl?.trim();
  const mode = branding?.brandingDisplay ?? "both";

  if (mode === "name") {
    return { showLogo: false, showName: true, displayName: name };
  }
  if (mode === "logo") {
    return { showLogo: !!logoUrl, showName: !logoUrl, displayName: name };
  }
  // both
  return { showLogo: !!logoUrl, showName: true, displayName: name };
}

const FALLBACK_INITIALS = "MFB";

/**
 * Get 1–2 letter initials from org/display name for collapsed sidebar etc.
 * e.g. "NedGab Consults" → "NC", "Support Hubs" → "MF", "Acme" → "AC".
 */
export function getBrandingInitials(displayName: string | null | undefined): string {
  const name = displayName?.trim();
  if (!name) return FALLBACK_INITIALS;
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const a = words[0].charAt(0);
    const b = words[1].charAt(0);
    return (a + b).toUpperCase().slice(0, 2);
  }
  const first = words[0] ?? "";
  return (first.slice(0, 2) || FALLBACK_INITIALS).toUpperCase();
}

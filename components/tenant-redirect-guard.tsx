"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/contexts/session-context";

/**
 * When a tenant user (has organizationId) visits the dashboard on the platform/root domain
 * (e.g. localhost:3000 or supporthubs.org without subdomain), redirect them to their
 * organization's subdomain with the same path (e.g. nedgabconsults.localhost:3000/dashboard/billing).
 */
export function TenantRedirectGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useSession();
  const redirected = useRef(false);

  useEffect(() => {
    if (isLoading || redirected.current) return;
    if (!user?.organizationId) return; // platform admin or not logged in

    const hostname =
      typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";

    // Already on a tenant subdomain (e.g. nedgabconsults.localhost or acme.supporthubs.org)
    const isTenantSubdomain =
      hostname.endsWith(".localhost") ||
      (hostname.includes(".") && hostname !== "localhost" && !hostname.startsWith("127."));
    if (isTenantSubdomain) return;

    redirected.current = true;
    fetch("/api/me/tenant-dashboard-url", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("No tenant URL"))))
      .then((data: { url: string }) => {
        const base = (data.url ?? "").replace(/\/$/, "");
        if (!base) return;
        const fullUrl = `${base}${pathname ?? ""}`;
        window.location.replace(fullUrl);
      })
      .catch(() => {
        redirected.current = false;
      });
  }, [user?.organizationId, isLoading, pathname]);

  return <>{children}</>;
}

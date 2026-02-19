/**
 * Tenant (organization) resolution from request hostname.
 * Used in API routes and server code to scope data by organization.
 */

import { db, setRequestRlsContext } from "@/lib/db";

const APP_DOMAIN = process.env.APP_DOMAIN ?? "localhost";
const RESERVED_SUBDOMAINS = new Set(["www", "app", "api", "admin", "platform", "mail"]);

export type TenantBrandingDisplay = "logo" | "name" | "both";

export interface TenantContext {
  organizationId: string;
  slug: string;
  name: string;
  status: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  description: string | null;
  brandingDisplay: TenantBrandingDisplay;
}

export function getSubdomainFromHost(host: string): string | null {
  const hostLower = host.split(":")[0].toLowerCase().trim();
  if (!hostLower) return null;
  if (hostLower.endsWith(".localhost")) {
    const prefix = hostLower.slice(0, -".localhost".length);
    const sub = prefix ? prefix.split(".").pop() ?? null : null;
    return sub || null;
  }
  if (hostLower === "localhost" || hostLower.startsWith("127.")) return null;
  const domain = APP_DOMAIN.split(":")[0].toLowerCase();
  if (!hostLower.endsWith(domain) || hostLower === domain) return null;
  const prefix = hostLower.slice(0, -domain.length - 1).replace(/\.$/, "");
  if (!prefix) return null;
  const parts = prefix.split(".");
  return parts[parts.length - 1] || null;
}

function getHostFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-host");
  const hostHeader = forwarded || request.headers.get("host");
  if (hostHeader) {
    const h = hostHeader.split(",")[0].trim().split(":")[0].trim();
    if (h) return h;
  }
  try {
    return new URL(request.url).hostname;
  } catch {
    return "localhost";
  }
}

export async function getTenantFromRequest(request: Request): Promise<TenantContext | null> {
  try {
    const host = getHostFromRequest(request);
    const url = new URL(request.url);
    let subdomain = getSubdomainFromHost(host);
    const isLocalHost = host === "localhost" || host.startsWith("127.");
    if (isLocalHost && subdomain == null) {
      const q = url.searchParams.get("tenant");
      if (q && /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(q)) subdomain = q;
    }
    const slug = subdomain != null && !RESERVED_SUBDOMAINS.has(subdomain) ? subdomain : "default";
    await setRequestRlsContext(null, "tenant_resolver");
    const org = await db.organization.findUnique({
      where: { slug, status: { in: ["ACTIVE", "PENDING"] } },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        description: true,
        brandingDisplay: true,
      },
    });
    if (!org) return null;
    const display = org.brandingDisplay === "logo" || org.brandingDisplay === "name" || org.brandingDisplay === "both" ? org.brandingDisplay : "both";
    return {
      organizationId: org.id,
      slug: org.slug,
      name: org.name,
      status: org.status,
      logoUrl: org.logoUrl ?? null,
      primaryColor: org.primaryColor ?? null,
      secondaryColor: org.secondaryColor ?? null,
      description: org.description ?? null,
      brandingDisplay: display,
    };
  } catch {
    return null;
  }
}

export async function getTenantFromHost(host: string): Promise<TenantContext | null> {
  const subdomain = getSubdomainFromHost(host);
  if (subdomain == null || RESERVED_SUBDOMAINS.has(subdomain)) return null;
  await setRequestRlsContext(null, "tenant_resolver");
  const org = await db.organization.findUnique({
    where: { slug: subdomain, status: { in: ["ACTIVE", "PENDING"] } },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      description: true,
      brandingDisplay: true,
    },
  });
  if (!org) return null;
  const display = org.brandingDisplay === "logo" || org.brandingDisplay === "name" || org.brandingDisplay === "both" ? org.brandingDisplay : "both";
  return {
    organizationId: org.id,
    slug: org.slug,
    name: org.name,
    status: org.status,
    logoUrl: org.logoUrl ?? null,
    primaryColor: org.primaryColor ?? null,
    secondaryColor: org.secondaryColor ?? null,
    description: org.description ?? null,
    brandingDisplay: display,
  };
}

export function isPlatformDomain(request: Request): boolean {
  try {
    const host = getHostFromRequest(request);
    const url = new URL(request.url);
    const subdomain = getSubdomainFromHost(host);
    if ((host === "localhost" || host.startsWith("127.")) && subdomain == null) {
      const q = url.searchParams.get("tenant");
      if (q && /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(q) && !RESERVED_SUBDOMAINS.has(q)) return false;
    }
    return subdomain == null || RESERVED_SUBDOMAINS.has(subdomain);
  } catch {
    return true;
  }
}

/**
 * Same as isPlatformDomain but for server components that only have headers (and optional ?tenant=).
 * Returns true when on platform domain (no tenant), false when on a tenant domain.
 */
export function isPlatformDomainFromHeaders(
  headers: Headers,
  tenantQuery?: string | null
): boolean {
  const forwarded = headers.get("x-forwarded-host");
  const hostHeader = forwarded || headers.get("host");
  let host = "localhost";
  if (hostHeader) {
    const h = hostHeader.split(",")[0].trim().split(":")[0].trim().toLowerCase();
    if (h) host = h;
  }
  const subdomain = getSubdomainFromHost(host);
  if ((host === "localhost" || host.startsWith("127.")) && subdomain == null) {
    const q = tenantQuery ?? null;
    if (q && /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(q) && !RESERVED_SUBDOMAINS.has(q)) return false;
  }
  return subdomain == null || RESERVED_SUBDOMAINS.has(subdomain);
}

export { getTenantBaseUrl, getTenantLoginUrl } from "./tenant-urls";

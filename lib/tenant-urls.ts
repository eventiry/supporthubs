/**
 * Pure tenant URL helpers. Safe for client components (no db import).
 */

export function getTenantBaseUrl(slug: string): string {
  const domain = (process.env.NEXT_PUBLIC_APP_DOMAIN ?? process.env.APP_DOMAIN ?? "").split(":")[0].toLowerCase();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  if (!domain || domain === "localhost" || domain.startsWith("127.")) {
    const port = new URL(baseUrl).port || "3000";
    return `http://${slug}.localhost:${port}`;
  }
  const protocol = baseUrl.startsWith("https") ? "https" : "http";
  return `${protocol}://${slug}.${domain}`;
}

export function getTenantLoginUrl(slug: string): string {
  return `${getTenantBaseUrl(slug)}/login`;
}

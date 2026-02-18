import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://supporthubs.org";

/** Public routes to include in sitemap. Excludes auth and dashboard (behind login). */
const STATIC_PATHS = [
  "",
  "/pricing",
  "/benefits",
  "/about",
  "/contact",
  "/legal/privacy",
  "/legal/terms",
  "/legal/cookies",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_PATHS.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : ("monthly" as const),
    priority: path === "" ? 1 : 0.8,
  }));
}

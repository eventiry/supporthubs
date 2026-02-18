/**
 * Central email branding and config for all transactional emails.
 * Uses env vars so production can override logo, support email, and company details.
 */

export const EMAIL_APP_NAME = process.env.EMAIL_APP_NAME ?? "Support Hubs";

/** Optional: full URL to logo image for email header (e.g. https://yourdomain.com/logo-email.png). Must be absolute. */
export const EMAIL_LOGO_URL = process.env.EMAIL_LOGO_URL ?? undefined;

/** Support or contact email shown in footer. */
export const EMAIL_SUPPORT_EMAIL = process.env.EMAIL_SUPPORT_EMAIL ?? process.env.CONTACT_EMAIL ?? "support@supporthubs.org";

/** Company / platform name for "Powered by" (e.g. Ordafy). */
export const EMAIL_COMPANY_NAME = process.env.EMAIL_COMPANY_NAME ?? "Ordafy";

/** Company URL for footer link. */
export const EMAIL_COMPANY_URL = process.env.EMAIL_COMPANY_URL ?? "https://ordafy.com";

/** Optional: privacy policy URL for footer. */
export const EMAIL_PRIVACY_URL = process.env.EMAIL_PRIVACY_URL ?? undefined;

/** Optional: app marketing URL for footer (e.g. homepage). */
export const EMAIL_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.EMAIL_APP_URL ?? "https://supporthubs.org";

/** Brand primary colour (CSS-compatible). Used in header and buttons. */
export const EMAIL_BRAND_COLOR = process.env.EMAIL_BRAND_COLOR ?? "hsl(142, 52%, 32%)";

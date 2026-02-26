/**
 * Password reset and set-password email delivery.
 * Uses shared sendEmail (Resend + SMTP fallback).
 * When no email transport is configured, in development the link is logged to the console.
 */

import { sendEmail } from "@/lib/email/send";
import { PasswordResetEmail, SetPasswordEmail } from "@/lib/email";
import { EMAIL_APP_NAME } from "@/lib/email/config";
import { getTenantBaseUrl } from "@/lib/tenant-urls";

const RESET_LINK_TTL_HOURS = 1;
const SET_PASSWORD_LINK_TTL_HOURS = 24;

export function getResetLinkBaseUrl(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

/**
 * Builds the reset-password (or set-password) URL. When the user belongs to an organization,
 * uses that organization's subdomain so they land on the correct tenant; otherwise uses the main domain.
 */
export function buildResetPasswordUrl(token: string, organizationSlug?: string | null): string {
  const base =
    organizationSlug != null && organizationSlug.trim() !== ""
      ? getTenantBaseUrl(organizationSlug.trim())
      : getResetLinkBaseUrl();
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

/**
 * Send the password reset email via sendEmail (Resend with SMTP fallback).
 * When the user belongs to an organization, pass organizationName and logoUrl for org-scoped branding; otherwise platform branding is used.
 * If no transport is configured, in development logs the link to the server console.
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  firstName?: string,
  organizationName?: string | null,
  logoUrl?: string | null
): Promise<void> {
  const resetUrl = buildResetPasswordUrl(token);

  try {
    await sendEmail({
      to: email,
      subject: `Reset your ${organizationName ?? EMAIL_APP_NAME} password`,
      react: PasswordResetEmail({
        firstName: firstName ?? "there",
        resetUrl,
        organizationName: organizationName ?? undefined,
        logoUrl: logoUrl ?? undefined,
      }),
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log("[Password reset] No email transport configured. Link for", email, ":", resetUrl);
      return;
    }
    throw err;
  }
}

/** TTL for forgot-password tokens (1 hour). */
export const RESET_TOKEN_TTL_MS = RESET_LINK_TTL_HOURS * 60 * 60 * 1000;

/** TTL for set-password (new user) tokens (24 hours). */
export const SET_PASSWORD_TOKEN_TTL_MS = SET_PASSWORD_LINK_TTL_HOURS * 60 * 60 * 1000;

/**
 * Send the "set up your password" email to a newly created user.
 * Uses the same reset-password link flow; optional organization logo in header.
 * If no transport is configured, in development logs the link to the server console.
 */
export async function sendSetPasswordEmail(
  email: string,
  token: string,
  firstName: string,
  organizationName: string,
  roleLabel: string,
  logoUrl?: string | null,
  organizationSlug?: string | null
): Promise<void> {
  const setPasswordUrl = buildResetPasswordUrl(token, organizationSlug);

  try {
    await sendEmail({
      to: email,
      subject: `Set up your ${organizationName ?? EMAIL_APP_NAME} password`,
      react: SetPasswordEmail({
        firstName,
        setPasswordUrl,
        organizationName,
        roleLabel,
        logoUrl: logoUrl ?? undefined,
      }),
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log("[Set password] No email transport configured. Link for", email, ":", setPasswordUrl);
      return;
    }
    throw err;
  }
}

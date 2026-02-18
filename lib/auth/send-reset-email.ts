/**
 * Password reset email delivery.
 * Uses shared sendEmail (Resend + SMTP fallback, same approach as ordafy-application packages/email).
 * When no email transport is configured, in development the reset link is logged to the console.
 */

import { sendEmail } from "@/lib/email/send";
import { PasswordResetEmail } from "@/lib/email";

const RESET_LINK_TTL_HOURS = 1;
const APP_NAME = "Support Hubs";

export function getResetLinkBaseUrl(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export function buildResetPasswordUrl(token: string): string {
  const base = getResetLinkBaseUrl();
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

/**
 * Send the password reset email via sendEmail (Resend with SMTP fallback).
 * If no transport is configured, in development logs the link to the server console.
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  firstName?: string
): Promise<void> {
  const resetUrl = buildResetPasswordUrl(token);

  try {
    await sendEmail({
      to: email,
      subject: `Reset your ${APP_NAME} password`,
      react: PasswordResetEmail({
        firstName: firstName ?? "there",
        resetUrl,
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

export const RESET_TOKEN_TTL_MS = RESET_LINK_TTL_HOURS * 60 * 60 * 1000;

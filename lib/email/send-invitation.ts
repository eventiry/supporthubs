/**
 * Send invitation email with one-time join link.
 */

import { sendEmail } from "@/lib/email/send";
import { EMAIL_APP_NAME } from "@/lib/email/config";
import { InvitationEmail } from "@/lib/email/templates/invitation";
const DEFAULT_JOIN_LINK_TTL_DAYS = 14;

function getJoinLinkBaseUrl(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export function buildJoinUrl(token: string): string {
  const base = getJoinLinkBaseUrl();
  return `${base}/join?token=${encodeURIComponent(token)}`;
}

export async function sendInvitationEmail(
  to: string,
  organizationName: string,
  subdomainSlug: string,
  token: string,
  expiresInDays: number = DEFAULT_JOIN_LINK_TTL_DAYS
): Promise<void> {
  const joinUrl = buildJoinUrl(token);

  try {
    await sendEmail({
      to,
      subject: `You're invited to join ${organizationName} on ${EMAIL_APP_NAME}`,
      react: InvitationEmail({
        organizationName,
        subdomainSlug,
        joinUrl,
        expiresInDays,
      }),
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log("[Invitation] No email transport. Join link for", to, ":", joinUrl);
      return;
    }
    throw err;
  }
}

export const INVITATION_EXPIRY_DAYS = DEFAULT_JOIN_LINK_TTL_DAYS;

/**
 * Production-ready email sending: Resend primary, SMTP fallback.
 * - Resend when RESEND_API_KEY is set (recommended for deliverability).
 * - Falls back to SMTP on rate limit/network errors or when Resend not set.
 * - Supports replyTo, from, and optional Reply-To header for support.
 */

import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { EMAIL_APP_NAME, EMAIL_SUPPORT_EMAIL } from "./config";

const DEFAULT_FROM = `${EMAIL_APP_NAME} <onboarding@resend.dev>`;

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  from?: string;
  /** Reply-To header (e.g. support@yourdomain.com). Recommended for transactional emails. */
  replyTo?: string | string[];
  react?: ReactElement;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
  }>;
}

function getFrom(): string {
  if (typeof process !== "undefined" && process.env.RESEND_FROM_EMAIL) {
    return process.env.RESEND_FROM_EMAIL;
  }
  if (typeof process !== "undefined" && process.env.EMAIL_FROM) {
    return process.env.EMAIL_FROM;
  }
  return DEFAULT_FROM;
}

function isResendRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = error && typeof error === "object" && "code" in error ? (error as { code: string }).code : "";
  const lower = message.toLowerCase();
  return (
    lower.includes("rate limit") ||
    lower.includes("usage limit") ||
    lower.includes("quota") ||
    lower.includes("network") ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT"
  );
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { to, subject, from: fromOption, replyTo, react, html, text, attachments } = options;

  const emailHtml = react ? await render(react) : html;
  if (!emailHtml) {
    throw new Error("Either react or html must be provided");
  }

  const recipients = Array.isArray(to) ? to : [to];
  const from = fromOption ?? getFrom();
  const effectiveReplyTo = replyTo ?? (EMAIL_SUPPORT_EMAIL ? [EMAIL_SUPPORT_EMAIL] : undefined);

  // 1) Try Resend first when API key is set
  if (process.env.TESTING !== "true" && process.env.RESEND_API_KEY) {
    try {
      let resendAttachments: { filename: string; content: string }[] = [];
      if (attachments?.length) {
        const fs = await import("fs/promises");
        resendAttachments = await Promise.all(
          attachments.map(async (att) => {
            const content =
              att.content ?? (att.path ? await fs.readFile(att.path) : undefined);
            return {
              filename: att.filename,
              content:
                content instanceof Buffer
                  ? content.toString("base64")
                  : (content as string) ?? "",
            };
          })
        );
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from,
          to: recipients,
          subject,
          html: emailHtml,
          text: text ?? undefined,
          reply_to: effectiveReplyTo ? (Array.isArray(effectiveReplyTo) ? effectiveReplyTo[0] : effectiveReplyTo) : undefined,
          attachments: resendAttachments.length ? resendAttachments : undefined,
        }),
      });

      if (!response.ok) {
        let error: { message?: string; code?: string; name?: string } = {};
        try {
          error = (await response.json()) as typeof error;
        } catch {
          error = { message: await response.text() };
        }
        console.error("[Email] Resend failed:", error);

        const isRateLimit =
          response.status === 429 ||
          error?.code === "rate_limit_exceeded" ||
          error?.name === "rate_limit_exceeded" ||
          (error?.message?.toLowerCase().includes("rate limit") ||
            error?.message?.toLowerCase().includes("usage limit") ||
            error?.message?.toLowerCase().includes("quota"));

        if (isRateLimit) {
          console.warn("[Email] Resend rate limit exceeded, falling back to SMTP");
        } else {
          const msg = error?.message ?? "Failed to send email";
          const details =
            error?.name === "validation_error"
              ? "Email service configuration error. Please contact support."
              : msg;
          throw new Error(details);
        }
      } else {
        const data = (await response.json()) as { id?: string };
        console.log("[Email] Sent via Resend:", data?.id);
        return;
      }
    } catch (err) {
      if (isResendRetryableError(err)) {
        console.warn("[Email] Resend error, falling back to SMTP:", err instanceof Error ? err.message : err);
      } else {
        console.error("[Email] Resend error (non-retryable):", err);
        throw err;
      }
    }
  }

  // 2) Fallback to SMTP when configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: Number.parseInt(process.env.SMTP_PORT ?? "587", 10),
        secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      let smtpAttachments: { filename: string; content: Buffer | string }[] | undefined;
      if (attachments?.length) {
        const fs = await import("fs/promises");
        smtpAttachments = await Promise.all(
          attachments.map(async (a) => ({
            filename: a.filename,
            content: (a.content ?? (a.path ? await fs.readFile(a.path) : Buffer.from(""))) as Buffer | string,
          }))
        );
      }

      const replyToStr = effectiveReplyTo ? (Array.isArray(effectiveReplyTo) ? effectiveReplyTo[0] : effectiveReplyTo) : undefined;
      await transporter.sendMail({
        from: process.env.EMAIL_FROM ?? from,
        to: recipients,
        replyTo: replyToStr,
        subject,
        html: emailHtml,
        text: text ?? undefined,
        attachments: smtpAttachments,
      });

      console.log("[Email] Sent via SMTP");
      return;
    } catch (error) {
      console.error("[Email] SMTP error:", error);
      throw new Error(
        `Failed to send email via SMTP: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  throw new Error("Email not configured: set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS");
}

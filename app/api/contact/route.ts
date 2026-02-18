import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { db, setPlatformRlsContext } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { ContactSubmissionEmail } from "@/lib/email/templates/contact-submission";
import { ContactConfirmationEmail } from "@/lib/email/templates/contact-confirmation";

const CONTACT_EMAIL = (process.env.CONTACT_EMAIL ?? process.env.EMAIL_SUPPORT_EMAIL ?? process.env.PLATFORM_EMAIL ?? "").trim();

/**
 * POST /api/contact — submit contact form.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const organizationName = typeof payload.organizationName === "string" ? payload.organizationName.trim() : "";
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  const wantToUse = payload.wantToUse === true;

  if (!name) return NextResponse.json({ message: "Name is required" }, { status: 400 });
  if (!email) return NextResponse.json({ message: "Email is required" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ message: "Invalid email address" }, { status: 400 });
  if (!organizationName) return NextResponse.json({ message: "Organization name is required" }, { status: 400 });
  if (!message) return NextResponse.json({ message: "Message is required" }, { status: 400 });

  await setPlatformRlsContext();
  const submission = await db.contactSubmission.create({
    data: { name, email, organizationName, message, wantToUse },
  });

  try {
    await sendEmail({
      to: email,
      subject: "We've received your message – Support Hubs",
      react: React.createElement(ContactConfirmationEmail, { name }),
    });
  } catch (err) {
    console.error("[Contact] Failed to send confirmation email:", err);
  }

  if (CONTACT_EMAIL) {
    try {
      await sendEmail({
        to: CONTACT_EMAIL,
        subject: `[Support Hubs] Contact from ${name} (${organizationName})`,
        react: React.createElement(ContactSubmissionEmail, {
          name,
          email,
          organizationName,
          message,
          wantToUse,
        }),
      });
    } catch (err) {
      console.error("[Contact] Failed to send notification email:", err);
    }
  }

  return NextResponse.json({ id: submission.id, message: "Thank you. We'll be in touch." }, { status: 201 });
}

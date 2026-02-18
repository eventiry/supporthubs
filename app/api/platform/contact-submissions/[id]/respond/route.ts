import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPlatformAdminSession } from "@/lib/api/get-platform-admin-session";
import { sendEmail } from "@/lib/email/send";
import { ContactReplyEmail } from "@/lib/email/templates/contact-reply";
import React from "react";

/**
 * POST /api/platform/contact-submissions/[id]/respond — send a reply email to the enquirer (platform admin only).
 * Body: { message: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await getPlatformAdminSession(req);
  if (out instanceof NextResponse) return out;

  const { id } = await params;
  const submission = await db.contactSubmission.findUnique({
    where: { id },
  });

  if (!submission) {
    return NextResponse.json({ message: "Contact submission not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const message = typeof (body as { message?: unknown }).message === "string"
    ? (body as { message: string }).message.trim()
    : "";

  if (!message) {
    return NextResponse.json({ message: "Reply message is required" }, { status: 400 });
  }

  try {
    await sendEmail({
      to: submission.email,
      subject: `Re: Your enquiry – Support Hubs`,
      react: React.createElement(ContactReplyEmail, {
        enquirerName: submission.name,
        replyMessage: message,
      }),
    });
  } catch (err) {
    console.error("[Contact respond] Failed to send reply email:", err);
    return NextResponse.json(
      { message: "Failed to send reply email. Check email configuration." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}

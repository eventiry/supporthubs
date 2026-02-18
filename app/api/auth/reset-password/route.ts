import { NextResponse } from "next/server";
import { createHash } from "crypto";
import * as bcrypt from "bcryptjs";
import { db, setPlatformRlsContext } from "@/lib/db";

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * POST /api/auth/reset-password
 * Body: { token: string, newPassword: string }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      newPassword?: string;
    };
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const newPassword =
      typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!token) {
      return NextResponse.json(
        { message: "Reset token is required" },
        { status: 400 }
      );
    }
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    await setPlatformRlsContext();
    const tokenHash = hashToken(token);
    const now = new Date();

    const record = await db.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !record ||
      record.expiresAt < now ||
      record.user.status !== "ACTIVE"
    ) {
      return NextResponse.json(
        { message: "This reset link is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.$transaction([
      db.user.update({
        where: { id: record.userId },
        data: { passwordHash, updatedAt: now },
      }),
      db.passwordResetToken.delete({ where: { id: record.id } }),
    ]);

    return NextResponse.json({
      message: "Your password has been reset. You can now sign in.",
    });
  } catch {
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { db, setPlatformRlsContext } from "@/lib/db";
import {
  sendPasswordResetEmail,
  RESET_TOKEN_TTL_MS,
} from "@/lib/auth/send-reset-email";

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 * Always returns 200 with the same message to avoid user enumeration.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    await setPlatformRlsContext();
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, status: true, firstName: true },
    });

    if (user && user.status === "ACTIVE") {
      const token = randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await db.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await db.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      await sendPasswordResetEmail(email, token, user.firstName);
    }
    // Same response whether or not account exists
    return NextResponse.json({
      message:
        "If an account exists with that email, we've sent a link to reset your password. Please check your inbox.",
    });
  } catch {
    return NextResponse.json(
      { message: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}

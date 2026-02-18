import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db, setPlatformRlsContext, setTenantRlsContext } from "@/lib/db";
import * as store from "@/lib/auth/session-store";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

async function getSessionUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;
  return store.getSession(sessionId) ?? null;
}

/**
 * PATCH /api/auth/change-password
 * Body: { currentPassword: string, newPassword: string }
 * Requires authenticated session.
 */
export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  if (user.organizationId) {
    await setTenantRlsContext(user.organizationId);
  } else {
    await setPlatformRlsContext();
  }

  try {
    const body = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };
    const currentPassword =
      typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword =
      typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword) {
      return NextResponse.json(
        { message: "Current password is required" },
        { status: 400 }
      );
    }
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { message: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true, status: true },
    });
    if (!dbUser || dbUser.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "Account not found or inactive" },
        { status: 403 }
      );
    }

    const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { message: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash, updatedAt: new Date() },
    });

    return NextResponse.json({
      message: "Your password has been updated.",
    });
  } catch {
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getPlatformAdminSession } from "@/lib/api/get-platform-admin-session";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET ?? "supporthubs";

/**
 * POST /api/upload/organization-logo
 * FormData: file (required), organizationId (optional; platform admin only).
 * - Platform admin: may pass organizationId to set which org's logo to update.
 * - Tenant admin: must not pass organizationId; updates current tenant's org.
 */
export async function POST(request: NextRequest) {
  const hasAwsCredentials =
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
  if (!hasAwsCredentials) {
    return NextResponse.json(
      {
        error:
          "AWS credentials not configured. Please configure AWS S3 for logo uploads.",
      },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const organizationIdParam = (formData.get("organizationId") as string | null)?.trim() || null;

  let organizationId: string | null = null;

  if (organizationIdParam) {
    const platformSession = await getPlatformAdminSession(request);
    if (platformSession instanceof NextResponse) return platformSession;
    const org = await db.organization.findUnique({
      where: { id: organizationIdParam },
      select: { id: true },
    });
    if (!org) {
      return NextResponse.json({ message: "Organization not found" }, { status: 404 });
    }
    organizationId = org.id;
  } else {
    const sessionOut = await getSessionUserAndTenant(request);
    if (sessionOut instanceof NextResponse) return sessionOut;
    const { user } = sessionOut;
    if (user.role !== "admin") {
      return NextResponse.json(
        { message: "Only tenant admins can upload organization logo." },
        { status: 403 }
      );
    }
    organizationId = sessionOut.tenant.organizationId;
  }

  if (!file) {
    return NextResponse.json({ message: "No file provided" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { message: "File must be an image" },
      { status: 400 }
    );
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { message: "Image size must be less than 5MB" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() ?? "png";
  const key = `organizations/${organizationId}/logo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );
  } catch (err: unknown) {
    const code = err && typeof err === "object" && "name" in err ? (err as { name?: string }).name : undefined;
    if (code === "NoSuchBucket") {
      return NextResponse.json(
        {
          error:
            "S3 bucket not configured. Please configure AWS_S3_BUCKET for logo uploads.",
        },
        { status: 503 }
      );
    }
    console.error("[upload/organization-logo] S3 error:", err);
    return NextResponse.json(
      { message: "Failed to upload logo" },
      { status: 500 }
    );
  }

  const region = process.env.AWS_REGION ?? "us-east-1";
  const logoUrl = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;

  const existing = await db.organization.findUnique({
    where: { id: organizationId },
    select: { logoUrl: true },
  });
  const oldLogoUrl = existing?.logoUrl ?? null;

  const updated = await db.organization.update({
    where: { id: organizationId },
    data: { logoUrl },
  });

  if (oldLogoUrl && oldLogoUrl !== logoUrl && oldLogoUrl.includes(BUCKET_NAME)) {
    try {
      const oldPath = new URL(oldLogoUrl).pathname.replace(/^\//, "");
      s3Client
        .send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: oldPath }))
        .catch((e) => console.error("[upload] delete old logo failed:", e));
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    url: logoUrl,
    logo: logoUrl,
    organization: updated,
  });
}

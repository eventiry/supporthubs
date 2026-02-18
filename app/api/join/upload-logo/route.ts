import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { db, setPlatformRlsContext } from "@/lib/db";

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
 * POST /api/join/upload-logo — upload logo during onboarding (no auth; token required).
 * FormData: token (required), file (required).
 * Validates invitation token, uploads to S3, returns { logoUrl } for use in join submit.
 */
export async function POST(request: NextRequest) {
  const hasAwsCredentials =
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
  if (!hasAwsCredentials) {
    return NextResponse.json(
      { message: "Logo upload is not configured. Use a logo URL instead." },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const token = (formData.get("token") as string | null)?.trim() ?? "";
  const file = formData.get("file") as File | null;

  if (!token) return NextResponse.json({ message: "Token is required" }, { status: 400 });
  if (!file) return NextResponse.json({ message: "No file provided" }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ message: "File must be an image" }, { status: 400 });
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return NextResponse.json({ message: "Image must be less than 5MB" }, { status: 400 });
  }

  await setPlatformRlsContext();
  const invitation = await db.invitation.findUnique({
    where: { token },
    select: { id: true, status: true, expiresAt: true },
  });

  if (!invitation) {
    return NextResponse.json({ message: "Invalid or expired invitation" }, { status: 404 });
  }
  if (invitation.status !== "PENDING") {
    return NextResponse.json({ message: "This invitation has already been used" }, { status: 400 });
  }
  if (invitation.expiresAt < new Date()) {
    return NextResponse.json({ message: "This invitation has expired" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") ?? "png";
  const key = `join-pending/${invitation.id}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        ACL: "public-read",
      })
    );
  } catch (err: unknown) {
    const code = err && typeof err === "object" && "name" in err ? (err as { name?: string }).name : undefined;
    if (code === "NoSuchBucket") {
      return NextResponse.json(
        { message: "Logo upload is not configured. Use a logo URL instead." },
        { status: 503 }
      );
    }
    console.error("[join/upload-logo] S3 error:", err);
    return NextResponse.json({ message: "Failed to upload logo" }, { status: 500 });
  }

  const region = process.env.AWS_REGION ?? "us-east-1";
  const logoUrl = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;

  return NextResponse.json({ logoUrl });
}

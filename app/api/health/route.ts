import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    // DB unreachable
  }
  return NextResponse.json({
    ok: true,
    ...(dbOk ? { database: "connected" as const } : { database: "disconnected" as const }),
  });
}

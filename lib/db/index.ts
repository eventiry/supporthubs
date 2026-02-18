import { PrismaClient } from "@prisma/client";

// Server-only: throw if used in browser
if (typeof window !== "undefined") {
  throw new Error(
    "Database client cannot be used in browser/client components. " +
      "Import @/lib/db only in server-side code (API routes, server components). " +
      "Use API endpoints for client-side data fetching."
  );
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env (e.g. DATABASE_URL=postgresql://user:password@localhost:5432/my_food_bank)"
    );
  }
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connect_timeout")) {
      parsed.searchParams.set("connect_timeout", "10");
    }
    if (!parsed.searchParams.has("statement_timeout")) {
      parsed.searchParams.set("statement_timeout", "30000");
    }
    if (!parsed.searchParams.has("application_name")) {
      parsed.searchParams.set("application_name", "my-food-bank");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: { db: { url: getDatabaseUrl() } },
  });
}

const db: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// Graceful disconnect
if (typeof process !== "undefined") {
  const shutdown = async () => {
    try {
      await db.$disconnect();
    } catch {
      // ignore
    }
  };
  process.on("beforeExit", shutdown);
  process.on("SIGINT", () => {
    shutdown().then(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    shutdown().then(() => process.exit(0));
  });
}

export { db };
import * as rls from "./rls";

export async function setRequestRlsContext(
  organizationId: string | null,
  role: "super_admin" | "tenant_resolver" | null
): Promise<void> {
  return rls.setRequestRlsContext(db, organizationId, role);
}
export async function setPlatformRlsContext(): Promise<void> {
  return rls.setPlatformRlsContext(db);
}
export async function setTenantRlsContext(organizationId: string): Promise<void> {
  return rls.setTenantRlsContext(db, organizationId);
}

export { Prisma, PrismaClient } from "@prisma/client";
export {
  UserRole,
  UserStatus,
  VoucherStatus,
  AuditAction,
  OrganizationStatus,
} from "@prisma/client";
export type {
  User,
  Agency,
  Client,
  ReferralDetails,
  FoodBankCenter,
  Voucher,
  Redemption,
  AuditLog,
  Organization,
} from "@prisma/client";

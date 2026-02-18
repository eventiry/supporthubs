import { PrismaClient } from "@prisma/client";
import type { UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { assignDefaultFreePlanToOrganization } from "../lib/subscription-defaults";
import { setRequestRlsContext } from "../lib/db/rls";

const prisma = new PrismaClient();
const SUPER_ADMIN_ROLE = "super_admin" as UserRole;

async function main() {
  await setRequestRlsContext(prisma, null, "super_admin");

  const defaultPassword = "ChangeMe123!";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  await prisma.subscriptionPlan.upsert({
    where: { slug: "starter" },
    update: {
      description: "For small teams getting started with voucher management.",
      features: ["Up to 3 users", "Voucher issuance & redemption", "Client management", "Email support"],
      priceMonthly: 0,
      priceYearly: null,
    },
    create: {
      name: "Starter",
      slug: "starter",
      tier: "starter",
      description: "For small teams getting started with voucher management.",
      features: ["Up to 3 users", "Voucher issuance & redemption", "Client management", "Email support"],
      limits: { maxUsers: 3, maxAgencies: 2, maxVouchersPerMonth: 100 },
      priceMonthly: 0,
      priceYearly: null,
      active: true,
    },
  });

  const defaultOrg = await prisma.organization.upsert({
    where: { slug: "default" },
    update: {},
    create: {
      slug: "default",
      name: "Default Organization",
      status: "ACTIVE",
    },
  });

  await assignDefaultFreePlanToOrganization(defaultOrg.id);

  const agency = await prisma.agency.upsert({
    where: { id: "seed-agency-1" },
    update: {},
    create: {
      id: "seed-agency-1",
      organizationId: defaultOrg.id,
      name: "Seed Referral Agency",
      contactPhone: "01910000000",
      contactEmail: "agency@example.com",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@supporthubs.local" },
    update: { role: SUPER_ADMIN_ROLE },
    create: {
      email: "admin@supporthubs.local",
      passwordHash: hashedPassword,
      firstName: "Platform",
      lastName: "Admin",
      role: SUPER_ADMIN_ROLE,
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "org_admin@supporthubs.local" },
    update: {},
    create: {
      email: "org_admin@supporthubs.local",
      passwordHash: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      organizationId: defaultOrg.id,
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "referral@supporthubs.local" },
    update: {},
    create: {
      email: "referral@supporthubs.local",
      passwordHash: hashedPassword,
      firstName: "Referral",
      lastName: "User",
      role: "third_party",
      agencyId: agency.id,
      organizationId: defaultOrg.id,
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "backoffice@supporthubs.local" },
    update: {},
    create: {
      email: "backoffice@supporthubs.local",
      passwordHash: hashedPassword,
      firstName: "Back Office",
      lastName: "User",
      role: "back_office",
      organizationId: defaultOrg.id,
      status: "ACTIVE",
    },
  });

  await prisma.foodBankCenter.upsert({
    where: { id: "seed-center-1" },
    update: {},
    create: {
      id: "seed-center-1",
      organizationId: defaultOrg.id,
      name: "Main Food Bank Centre",
      address: "1 High Street",
      postcode: "NE1 1AA",
      phone: "01911234567",
      email: "info@foodbank.local",
      canDeliver: true,
    },
  });

  console.log("Seed complete.");
  console.log("  Super Admin: admin@supporthubs.local /", defaultPassword);
  console.log("  Org Admin:   org_admin@supporthubs.local /", defaultPassword);
  console.log("  Third-party: referral@supporthubs.local /", defaultPassword);
  console.log("  Back office: backoffice@supporthubs.local /", defaultPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

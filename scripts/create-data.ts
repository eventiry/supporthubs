/**
 * Interactive script to create data with prompts and prefilled defaults.
 * Run: npm run create-data  (or tsx scripts/create-data.ts)
 *
 * First prompts for the type of data (Agency, User, Client, etc.),
 * then prompts for each field with optional default values.
 */

import * as readline from "readline";
import * as bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string, defaultValue?: string): Promise<string> {
  const suffix = defaultValue !== undefined && defaultValue !== "" ? ` (default: ${defaultValue})` : "";
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      const trimmed = answer.trim();
      resolve(trimmed !== "" ? trimmed : (defaultValue ?? ""));
    });
  });
}

function askNum(question: string, defaultValue?: number): Promise<number> {
  return ask(question, defaultValue?.toString()).then((s) => {
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? (defaultValue ?? 0) : n;
  });
}

function askBool(question: string, defaultValue: boolean): Promise<boolean> {
  const def = defaultValue ? "y" : "n";
  return ask(`${question} (y/n)`, def).then((s) => {
    const lower = s.toLowerCase();
    if (lower === "y" || lower === "yes" || lower === "1") return true;
    if (lower === "n" || lower === "no" || lower === "0") return false;
    return defaultValue;
  });
}

async function pickOne<T>(message: string, options: { label: string; value: T }[]): Promise<T> {
  console.log(`\n${message}`);
  options.forEach((o, i) => console.log(`  ${i + 1}. ${o.label}`));
  const raw = await ask("Enter number", "1");
  const idx = parseInt(raw, 10);
  const oneBased = Number.isNaN(idx) ? 1 : Math.max(1, Math.min(idx, options.length));
  return options[oneBased - 1]!.value;
}

// ---------- Prefilled defaults (edit these to change defaults) ----------
const DEFAULTS = {
  agency: {
    name: "New Referral Agency",
    contactPhone: "01910000000",
    contactEmail: "agency@example.com",
  },
  user: {
    email: "user@myfoodbank.local",
    password: "ChangeMe123!",
    firstName: "New",
    lastName: "User",
    role: "third_party" as const,
  },
  client: {
    firstName: "Jane",
    surname: "Doe",
    postcode: "NE1 2AB",
    noFixedAddress: false,
    address: "123 Example Street",
    yearOfBirth: 1990,
  },
  foodBankCenter: {
    name: "New Food Bank Centre",
    address: "1 High Street",
    postcode: "NE1 1AA",
    phone: "01911234567",
    email: "info@foodbank.local",
    canDeliver: true,
  },
  referralDetails: {
    notes: "Referral notes here.",
    incomeSource: "Employment",
    contactConsent: true,
    dietaryConsent: false,
    parcelNotes: "",
  },
  voucher: {
    code: `V-${Date.now().toString(36).toUpperCase()}`,
    collectionNotes: "",
  },
  auditLog: {
    action: "CREATE" as const,
    entity: "Client",
    entityId: "",
    changes: "{}",
  },
};

// ---------- Data type menu ----------
const DATA_TYPES = [
  { key: "agency", label: "Agency" },
  { key: "user", label: "User" },
  { key: "client", label: "Client" },
  { key: "foodBankCenter", label: "Food Bank Centre" },
  { key: "referralDetails", label: "Referral Details" },
  { key: "voucher", label: "Voucher" },
  { key: "redemption", label: "Redemption" },
  { key: "auditLog", label: "Audit Log" },
];

async function createAgency(): Promise<void> {
  console.log("\n--- Create Agency ---");
  const name = await ask("Name", DEFAULTS.agency.name);
  const contactPhone = await ask("Contact phone", DEFAULTS.agency.contactPhone);
  const contactEmail = await ask("Contact email", DEFAULTS.agency.contactEmail);

  const created = await prisma.agency.create({
    data: {
      name,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
    },
  });
  console.log("Created Agency:", created.id, created.name);
}

async function createUser(): Promise<void> {
  console.log("\n--- Create User ---");
  const email = await ask("Email", DEFAULTS.user.email);
  const password = await ask("Password", DEFAULTS.user.password);
  const firstName = await ask("First name", DEFAULTS.user.firstName);
  const lastName = await ask("Last name", DEFAULTS.user.lastName);

  const role = await pickOne("Role", [
    { label: "super_admin (platform – no organization)", value: "super_admin" as const },
    { label: "admin (organization)", value: "admin" as const },
    { label: "third_party (referral)", value: "third_party" as const },
    { label: "back_office (organization)", value: "back_office" as const },
  ]);

  let organizationId: string | null = null;
  let agencyId: string | null = null;

  if (role === "super_admin") {
    // Platform admin: no organization, no agency
    organizationId = null;
    agencyId = null;
  } else if (role === "admin" || role === "back_office") {
    // Organization-scoped: must pick an organization
    const orgs = await prisma.organization.findMany({ select: { id: true, name: true, slug: true } });
    if (orgs.length === 0) {
      console.log("No organizations found. Create an organization first (e.g. via join flow or seed).");
      return;
    }
    const chosen = await pickOne(
      "Organization",
      orgs.map((o) => ({ label: `${o.name} (${o.slug})`, value: o.id }))
    );
    organizationId = chosen;
    agencyId = null;
  } else if (role === "third_party") {
    const agencies = await prisma.agency.findMany({
      select: { id: true, name: true, organizationId: true },
    });
    if (agencies.length > 0) {
      const chosen = await pickOne(
        "Agency",
        agencies.map((a) => ({ label: a.name, value: a.id }))
      );
      agencyId = chosen as string | null;
      const agency = agencies.find((a) => a.id === agencyId);
      organizationId = agency?.organizationId ?? null;
    } else {
      console.log("No agencies found. Create an agency first or leave user without agency.");
    }
  }

  const passwordHash = await bcrypt.hash(password || DEFAULTS.user.password, 10);
  const created = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      organizationId,
      agencyId,
      status: "ACTIVE",
    },
  });
  console.log("Created User:", created.id, created.email, `(${role})`);
}

async function createClient(): Promise<void> {
  console.log("\n--- Create Client ---");
  const firstName = await ask("First name", DEFAULTS.client.firstName);
  const surname = await ask("Surname", DEFAULTS.client.surname);
  const postcode = await ask("Postcode", DEFAULTS.client.postcode);
  const noFixedAddress = await askBool("No fixed address?", DEFAULTS.client.noFixedAddress);
  const address = noFixedAddress ? null : await ask("Address", DEFAULTS.client.address);
  const yearOfBirthStr = await ask("Year of birth (optional)", String(DEFAULTS.client.yearOfBirth));
  const yearOfBirth = yearOfBirthStr ? parseInt(yearOfBirthStr, 10) : null;

  const created = await prisma.client.create({
    data: {
      firstName,
      surname,
      postcode: postcode || null,
      noFixedAddress,
      address: address || null,
      yearOfBirth: Number.isNaN(yearOfBirth!) ? null : yearOfBirth,
    },
  });
  console.log("Created Client:", created.id, `${created.firstName} ${created.surname}`);
}

async function createFoodBankCenter(): Promise<void> {
  console.log("\n--- Create Food Bank Centre ---");
  const name = await ask("Name", DEFAULTS.foodBankCenter.name);
  const address = await ask("Address", DEFAULTS.foodBankCenter.address);
  const postcode = await ask("Postcode", DEFAULTS.foodBankCenter.postcode);
  const phone = await ask("Phone", DEFAULTS.foodBankCenter.phone);
  const email = await ask("Email", DEFAULTS.foodBankCenter.email);
  const canDeliver = await askBool("Can deliver?", DEFAULTS.foodBankCenter.canDeliver);

  const created = await prisma.foodBankCenter.create({
    data: {
      name,
      address: address || null,
      postcode: postcode || null,
      phone: phone || null,
      email: email || null,
      canDeliver,
    },
  });
  console.log("Created Food Bank Centre:", created.id, created.name);
}

async function createReferralDetails(): Promise<void> {
  console.log("\n--- Create Referral Details ---");
  const notes = await ask("Notes (max 400 chars)", DEFAULTS.referralDetails.notes);
  const incomeSource = await ask("Income source", DEFAULTS.referralDetails.incomeSource);
  const contactConsent = await askBool("Contact consent?", DEFAULTS.referralDetails.contactConsent);
  const dietaryConsent = await askBool("Dietary consent?", DEFAULTS.referralDetails.dietaryConsent);
  const dietaryRequirements = await ask("Dietary requirements (optional)", "");
  const parcelNotes = await ask("Parcel notes (optional, max 400 chars)", DEFAULTS.referralDetails.parcelNotes);

  const created = await prisma.referralDetails.create({
    data: {
      notes: notes.slice(0, 400),
      incomeSource: incomeSource || null,
      contactConsent,
      dietaryConsent,
      dietaryRequirements: dietaryRequirements || null,
      parcelNotes: parcelNotes ? parcelNotes.slice(0, 400) : null,
    },
  });
  console.log("Created Referral Details:", created.id);
}

async function createVoucher(): Promise<void> {
  console.log("\n--- Create Voucher ---");

  const clients = await prisma.client.findMany({ select: { id: true, firstName: true, surname: true } });
  if (clients.length === 0) {
    console.log("No clients found. Create a client first.");
    return;
  }
  const clientId = await pickOne(
    "Client",
    clients.map((c) => ({ label: `${c.firstName} ${c.surname}`, value: c.id }))
  );

  const agencies = await prisma.agency.findMany({ select: { id: true, name: true } });
  if (agencies.length === 0) {
    console.log("No agencies found. Create an agency first.");
    return;
  }
  const agencyId = await pickOne(
    "Agency",
    agencies.map((a) => ({ label: a.name, value: a.id }))
  );

  const referrals = await prisma.referralDetails.findMany({ select: { id: true }, take: 20 });
  if (referrals.length === 0) {
    console.log("No referral details found. Create referral details first.");
    return;
  }
  const referralDetailsId = await pickOne(
    "Referral Details (by ID)",
    referrals.map((r, i) => ({ label: `Referral ${i + 1} (${r.id})`, value: r.id }))
  );

  const centers = await prisma.foodBankCenter.findMany({ select: { id: true, name: true } });
  let foodBankCenterId: string | null = null;
  if (centers.length > 0) {
    const choice = await pickOne("Food bank centre (optional)", [
      { label: "(none)", value: "" },
      ...centers.map((c) => ({ label: c.name, value: c.id })),
    ]);
    foodBankCenterId = choice as string | null;
  }

  const users = await prisma.user.findMany({ select: { id: true, email: true, firstName: true } });
  if (users.length === 0) {
    console.log("No users found. Create a user first.");
    return;
  }
  const issuedById = await pickOne(
    "Issued by (user)",
    users.map((u) => ({ label: `${u.email} (${u.firstName})`, value: u.id }))
  );

  const code = await ask("Voucher code", DEFAULTS.voucher.code);
  const issueDate = new Date();
  const expiryDate = new Date(issueDate);
  expiryDate.setDate(expiryDate.getDate() + 7);
  const issueStr = await ask("Issue date (YYYY-MM-DD)", issueDate.toISOString().slice(0, 10));
  const expiryStr = await ask("Expiry date (YYYY-MM-DD)", expiryDate.toISOString().slice(0, 10));
  const collectionNotes = await ask("Collection notes (optional)", DEFAULTS.voucher.collectionNotes);

  const created = await prisma.voucher.create({
    data: {
      code: code || `V-${Date.now()}`,
      clientId,
      agencyId,
      referralDetailsId,
      foodBankCenterId,
      issuedById,
      issueDate: new Date(issueStr || issueDate),
      expiryDate: new Date(expiryStr || expiryDate),
      collectionNotes: collectionNotes || null,
    },
  });
  console.log("Created Voucher:", created.id, created.code);
}

async function createRedemption(): Promise<void> {
  console.log("\n--- Create Redemption ---");

  const vouchers = await prisma.voucher.findMany({
    where: { status: "issued" },
    select: { id: true, code: true },
    take: 30,
  });
  if (vouchers.length === 0) {
    console.log("No issued vouchers found.");
    return;
  }
  const voucherId = await pickOne(
    "Voucher",
    vouchers.map((v) => ({ label: v.code, value: v.id }))
  );

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  if (users.length === 0) {
    console.log("No users found.");
    return;
  }
  const redeemedById = await pickOne(
    "Redeemed by (user)",
    users.map((u) => ({ label: u.email, value: u.id }))
  );

  const centers = await prisma.foodBankCenter.findMany({ select: { id: true, name: true } });
  if (centers.length === 0) {
    console.log("No food bank centres found.");
    return;
  }
  const centerId = await pickOne(
    "Centre",
    centers.map((c) => ({ label: c.name, value: c.id }))
  );

  const failureReason = await ask("Failure reason (optional)", "");

  const created = await prisma.redemption.create({
    data: {
      voucherId,
      redeemedById,
      centerId,
      failureReason: failureReason || null,
    },
  });
  console.log("Created Redemption:", created.id);
}

async function createAuditLog(): Promise<void> {
  console.log("\n--- Create Audit Log ---");

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  let userId: string | null = null;
  if (users.length > 0) {
    const choice = await pickOne("User (optional)", [
      { label: "(none)", value: "" },
      ...users.map((u) => ({ label: u.email, value: u.id })),
    ]);
    userId = choice as string | null;
  }

  const action = await pickOne("Action", [
    { label: "CREATE", value: "CREATE" as const },
    { label: "UPDATE", value: "UPDATE" as const },
    { label: "DELETE", value: "DELETE" as const },
    { label: "LOGIN", value: "LOGIN" as const },
    { label: "LOGOUT", value: "LOGOUT" as const },
    { label: "ISSUE_VOUCHER", value: "ISSUE_VOUCHER" as const },
    { label: "REDEEM_VOUCHER", value: "REDEEM_VOUCHER" as const },
  ]);

  const entity = await ask("Entity (e.g. Client, Voucher)", DEFAULTS.auditLog.entity);
  const entityId = await ask("Entity ID", DEFAULTS.auditLog.entityId);
  const changesStr = await ask("Changes (JSON, optional)", DEFAULTS.auditLog.changes);

  let changes: object | null | undefined  = null;
  if (changesStr) {
    try {
      changes = JSON.parse(changesStr) as object;
    } catch {
      console.log("Invalid JSON, storing as null.");
    }
  }

  const created = await prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      changes: changes ?? undefined,
    },
  });
  console.log("Created Audit Log:", created.id);
}

async function main(): Promise<void> {
  console.log("Support Hubs – Create data (interactive)\n");

  const typeChoice = await pickOne(
    "What type of data do you want to create?",
    DATA_TYPES.map((t) => ({ label: t.label, value: t.key }))
  );

  switch (typeChoice) {
    case "agency":
      await createAgency();
      break;
    case "user":
      await createUser();
      break;
    case "client":
      await createClient();
      break;
    case "foodBankCenter":
      await createFoodBankCenter();
      break;
    case "referralDetails":
      await createReferralDetails();
      break;
    case "voucher":
      await createVoucher();
      break;
    case "redemption":
      await createRedemption();
      break;
    case "auditLog":
      await createAuditLog();
      break;
    default:
      console.log("Unknown type.");
  }

  rl.close();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  rl.close();
  prisma.$disconnect();
  process.exit(1);
});

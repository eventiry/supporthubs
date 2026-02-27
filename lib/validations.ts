/**
 * Zod schemas for API request validation. Use in routes to parse and validate bodies.
 */

import { z } from "zod";

const UK_POSTCODE_REGEX = /^[A-Za-z]{1,2}[0-9][0-9A-Za-z]?\s?[0-9][A-Za-z]{2}$/;

export const clientCreateSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").transform((s) => s.trim()),
    surname: z.string().min(1, "Surname is required").transform((s) => s.trim()),
    postcode: z.string().optional(),
    noFixedAddress: z.boolean().optional(),
    address: z.string().optional(),
    yearOfBirth: z.union([z.number().int(), z.string()]).optional().nullable().transform((v) => {
      if (v == null) return null;
      const n = typeof v === "string" ? parseInt(v, 10) : v;
      return Number.isNaN(n) ? null : n;
    }),
    householdAdults: z.record(z.number()).optional().nullable(),
    householdChild: z.record(z.number()).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.noFixedAddress) return true;
      const pc = data.postcode?.trim();
      if (!pc) return false;
      return UK_POSTCODE_REGEX.test(pc.replace(/\s+/g, " "));
    },
    { message: "Postcode is required when no fixed address is not selected, and must be valid UK format", path: ["postcode"] }
  )
  .refine(
    (data) => data.noFixedAddress === true || (data.postcode?.trim() ?? "").length > 0,
    { message: "Either postcode or no fixed address is required", path: ["postcode"] }
  );

export const userCreateSchema = z.object({
  email: z.string().email("Invalid email").transform((s) => s.trim().toLowerCase()),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required").transform((s) => s.trim()),
  lastName: z.string().min(1, "Last name is required").transform((s) => s.trim()),
  role: z.enum(["admin", "third_party", "back_office"]),
  agencyId: z.string().optional().nullable(),
}).refine(
  (data) => data.role !== "third_party" || (data.agencyId != null && data.agencyId !== ""),
  { message: "Agency is required for third_party users", path: ["agencyId"] }
);

export const redeemPayloadSchema = z.object({
  centerId: z.string().min(1, "centerId is required"),
  failureReason: z.string().optional(),
  weightKg: z.number().min(0).optional(),
});

export const userUpdateSchema = z.object({
  role: z.enum(["admin", "third_party", "back_office"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  agencyId: z.string().nullable().optional(),
  firstName: z.string().min(1).transform((s) => s.trim()).optional(),
  lastName: z.string().min(1).transform((s) => s.trim()).optional(),
});

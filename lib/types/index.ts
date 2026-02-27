/**
 * Single source of truth for platform types and DTOs.
 * Do not import from lib/db or app to avoid circular dependencies.
 */

import type {
  User,
  Agency,
  Client,
  ReferralDetails,
  FoodBankCenter,
  Voucher,
  Redemption,
  AuditLog,
  Organization,
  SubscriptionPlan,
} from "@prisma/client";
import {
  UserRole,
  UserStatus,
  VoucherStatus,
  AuditAction,
  OrganizationStatus,
  SubscriptionStatus,
} from "@prisma/client";

// Re-export Prisma domain types and enums
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
  SubscriptionPlan,
};
export { UserRole, UserStatus, VoucherStatus, AuditAction, OrganizationStatus, SubscriptionStatus };

// ----- Auth -----

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  agencyId: string | null;
  /** null = platform admin; set = tenant user */
  organizationId: string | null;
  firstName: string;
  lastName: string;
}

export interface LoginResponse {
  user: SessionUser;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface HealthResponse {
  ok: boolean;
}

// ----- Contact (public form) -----

export interface ContactSubmitPayload {
  name: string;
  email: string;
  organizationName: string;
  message: string;
  wantToUse?: boolean;
}

export interface ContactSubmitResponse {
  id: string;
  message: string;
}

/** Platform admin: list item from GET /api/platform/contact-submissions */
export interface ContactSubmissionListItem {
  id: string;
  name: string;
  email: string;
  organizationName: string | null;
  message: string;
  wantToUse: boolean;
  createdAt: Date;
}

/** Platform admin: single submission from GET /api/platform/contact-submissions/[id] */
export interface ContactSubmissionDetail {
  id: string;
  name: string;
  email: string;
  organizationName: string | null;
  message: string;
  wantToUse: boolean;
  createdAt: Date;
}

/** Platform admin: body for POST /api/platform/contact-submissions/[id]/respond */
export interface ContactRespondPayload {
  message: string;
}

// ----- User management (admin) -----

export interface UserListParams {
  role?: UserRole;
  agencyId?: string;
}

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  agencyId: string | null;
  status: UserStatus;
  createdAt: Date;
}

export interface UserCreatePayload {
  email: string;
  password: string;
  role: UserRole;
  agencyId?: string;
  firstName: string;
  lastName: string;
}

export interface UserUpdatePayload {
  role?: UserRole;
  status?: UserStatus;
  agencyId?: string | null;
  firstName?: string;
  lastName?: string;
}

export interface AgencyCreatePayload {
  name: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface AgencyUpdatePayload {
  name?: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
}

export interface FoodBankCenterCreatePayload {
  name: string;
  address?: string;
  postcode?: string;
  phone?: string;
  email?: string;
  /** e.g. { "Mon": "10:00-11:30", "Thu": "10:00-13:00" } */
  openingHours?: Record<string, string> | null;
  canDeliver?: boolean;
}

export interface FoodBankCenterUpdatePayload {
  name?: string;
  address?: string | null;
  postcode?: string | null;
  phone?: string | null;
  email?: string | null;
  openingHours?: Record<string, string> | null;
  canDeliver?: boolean;
}

// ----- Platform admin (organizations) -----

export type OrganizationStatusType = "PENDING" | "ACTIVE" | "SUSPENDED" | "CANCELLED";

export interface OrganizationListItem {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatusType;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationCreatePayload {
  name: string;
  slug: string;
  status?: OrganizationStatusType;
}

export type SubscriptionStatusType = "none" | "trialing" | "active" | "past_due" | "cancelled";

export interface OrganizationUpdatePayload {
  name?: string;
  slug?: string;
  status?: OrganizationStatusType;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  subscriptionPlanId?: string | null;
  subscriptionStatus?: SubscriptionStatusType;
  billingEmail?: string | null;
  subscriptionStartedAt?: string | null;
  subscriptionEndsAt?: string | null;
}

/** Response from POST /api/upload/organization-logo */
export interface UploadOrganizationLogoResponse {
  url: string;
  logo: string;
  organization: Organization;
}

export interface SubscriptionPlanListItem {
  id: string;
  name: string;
  slug: string;
  tier: string;
  description: string | null;
  features: string[];
  limits: Record<string, unknown>;
  priceMonthly: number | null;
  priceYearly: number | null;
  active: boolean;
  stripePriceId: string | null;
  stripePriceIdYearly: string | null;
}

export interface PublicPlanItem {
  id: string;
  name: string;
  slug: string;
  tier: string;
  description: string | null;
  features: string[];
  limits: { maxUsers?: number; maxAgencies?: number; maxVouchersPerMonth?: number };
  priceMonthly: number | null;
  priceYearly: number | null;
}

/** Platform admin: one subscription record (from Subscription model). */
export interface SubscriptionListItem {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string | null;
  subscriptionPlanId: string | null;
  subscriptionPlanName: string | null;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
  createdAt: Date;
}

/** Create subscription plan (platform admin). */
export interface SubscriptionPlanCreatePayload {
  name: string;
  slug: string;
  tier: string;
  description?: string | null;
  features?: string[] | null;
  limits: Record<string, unknown>;
  priceMonthly?: number | null;
  priceYearly?: number | null;
  stripePriceId?: string | null;
}

/** Update subscription plan (platform admin). */
export interface SubscriptionPlanUpdatePayload {
  name?: string;
  slug?: string;
  tier?: string;
  description?: string | null;
  features?: string[] | null;
  limits?: Record<string, unknown>;
  priceMonthly?: number | null;
  priceYearly?: number | null;
  active?: boolean;
  stripePriceId?: string | null;
}

// ----- Billing (tenant: current org subscription) -----

export type BillingStatusType = "none" | "trialing" | "active" | "past_due" | "cancelled";

export interface BillingResponse {
  subscriptionEnabled: boolean;
  plan: {
    id: string;
    name: string;
    slug: string;
    tier: string;
    priceMonthly: number | null;
    priceYearly: number | null;
  } | null;
  status: BillingStatusType;
  billingEmail: string | null;
  subscriptionEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  canUsePortal: boolean;
}

// ----- Invitations (platform admin) -----

export type InvitationStatusType = "PENDING" | "USED" | "EXPIRED";

export interface InvitationListItem {
  id: string;
  email: string;
  organizationName: string;
  subdomainSlug: string;
  token: string;
  expiresAt: Date;
  status: InvitationStatusType;
  createdById: string;
  createdAt: Date;
  createdBy?: { id: string; email: string; firstName: string; lastName: string };
}

export interface InvitationCreatePayload {
  email: string;
  organizationName: string;
  subdomainSlug: string;
  customMessage?: string;
}

// ----- Join (public onboarding) -----

export interface JoinValidateResponse {
  valid: true;
  email: string;
  organizationName: string;
  subdomainSlug: string;
  expiresAt: string;
}

export interface JoinPayload {
  token: string;
  organizationName: string;
  subdomainSlug: string;
  adminEmail: string;
  password: string;
  firstName: string;
  lastName: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  createAsActive?: boolean;
}

export interface JoinResponse {
  redirectUrl: string;
}

// ----- Tenant branding (tenant admin) -----

/** How to show branding in sidebar, header and login: logo only, name only, or both. */
export type BrandingDisplay = "logo" | "name" | "both";

export interface TenantBrandingResponse {
  name: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  description: string | null;
  brandingDisplay: BrandingDisplay;
}

export interface TenantBrandingUpdatePayload {
  name?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  description?: string | null;
  brandingDisplay?: BrandingDisplay | null;
}

// ----- Pagination -----

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

// ----- Client search -----

export interface ClientSearchParams {
  firstName?: string;
  surname?: string;
  postcode?: string;
  noFixedAddress?: boolean;
}

export interface ClientSearchResult {
  id: string;
  firstName: string;
  surname: string;
  postcode: string | null;
  noFixedAddress: boolean;
  address: string | null;
  yearOfBirth: number | null;
  lastVoucherIssued: Date | null;
  lastVoucherFulfilled: Date | null;
  vouchersInLast6Months: number;
}

// ----- Client create/update -----

export interface ClientCreatePayload {
  firstName: string;
  surname: string;
  postcode?: string;
  noFixedAddress?: boolean;
  address?: string;
  yearOfBirth?: number;
  householdAdults?: Record<string, number>;
  householdChild?: Record<string, number>;
}

export type ClientUpdatePayload = Partial<ClientCreatePayload>;

/** Client with recent vouchers (for GET by id) */
export interface ClientWithVouchers extends Omit<Client, "vouchers"> {
  vouchers: VoucherSummary[];
}

// ----- Referral details (for voucher issuance) -----

export interface ReferralDetailsPayload {
  notes: string;
  incomeSource?: string;
  referralReasons?: unknown;
  ethnicGroup?: string;
  householdByAge?: unknown;
  contactConsent: boolean;
  dietaryConsent: boolean;
  dietaryRequirements?: string;
  moreThan3VouchersReason?: string;
  parcelNotes?: string;
}

// ----- Voucher -----

export interface VoucherListParams {
  status?: VoucherStatus;
  /** valid = issued and not expired; expired = status expired or issued and past expiry */
  validity?: "valid" | "expired";
  clientId?: string;
  code?: string;
  fromDate?: string; // ISO date
  toDate?: string; // ISO date
}

export interface VoucherCreatePayload {
  clientId: string;
  agencyId: string;
  referralDetails: ReferralDetailsPayload;
  foodBankCenterId?: string;
  issueDate: string; // ISO date
  expiryDate: string; // ISO date
  collectionNotes?: string;
  /** Parcel weight at issue (kg). */
  weightKg?: number;
}

export interface VoucherSummary {
  id: string;
  code: string;
  clientId: string;
  agencyId: string;
  status: VoucherStatus;
  issueDate: Date;
  expiryDate: Date;
  createdAt: Date;
  client?: Pick<Client, "firstName" | "surname">;
}

/** Voucher with relations for detail/print view */
export interface VoucherDetail {
  id: string;
  code: string;
  clientId: string;
  agencyId: string;
  referralDetailsId: string;
  foodBankCenterId: string | null;
  issueDate: Date;
  expiryDate: Date;
  status: VoucherStatus;
  collectionNotes: string | null;
  weightKg: number | null;
  client: Pick<Client, "id" | "firstName" | "surname" | "postcode" | "noFixedAddress" | "address">;
  agency: Pick<Agency, "id" | "name" | "contactPhone" | "contactEmail">;
  referralDetails: Pick<
    ReferralDetails,
    | "id"
    | "notes"
    | "incomeSource"
    | "referralReasons"
    | "ethnicGroup"
    | "householdByAge"
    | "contactConsent"
    | "dietaryConsent"
    | "dietaryRequirements"
    | "moreThan3VouchersReason"
    | "parcelNotes"
  >;
  foodBankCenter: Pick<
    FoodBankCenter,
    "id" | "name" | "address" | "postcode" | "phone" | "email" | "openingHours" | "canDeliver"
  > | null;
  issuedBy?: { firstName: string; lastName: string };
  organization?: { logoUrl: string | null; name: string };
  /** Latest redemption when status is redeemed (for print / redeemed-at info). */
  redemption?: RedemptionRecord | null;
}

export interface RedemptionRecord {
  id: string;
  voucherId: string;
  redeemedAt: Date;
  redeemedById: string;
  centerId: string;
  failureReason: string | null;
  /** Fulfillment weight (kg) if overridden at redeem */
  weightKg?: number | null;
}

// ----- Redemption -----

export interface RedemptionPayload {
  centerId: string;
  failureReason?: string;
  /** Fulfillment weight (kg); overrides voucher weight when provided */
  weightKg?: number;
}

export interface RedeemResponse {
  voucher: VoucherSummary;
  redemption: RedemptionRecord;
}

// ----- Reports -----

export interface ReportParams {
  fromDate?: string; // ISO date
  toDate?: string; // ISO date
  format?: "json" | "csv";
}

export interface ReportVoucherStats {
  issuedCount: number;
  redeemedCount: number;
  expiredCount: number;
  fromDate: string;
  toDate: string;
}

export interface ReportAgencyRow {
  agencyId: string;
  agencyName: string;
  issued: number;
  redeemed: number;
}

export interface ReportCenterRow {
  centerId: string;
  centerName: string;
  redeemed: number;
}

export interface ReportIncomeSourceRow {
  incomeSource: string;
  count: number;
}

export interface ReportData {
  issuedCount: number;
  redeemedCount: number;
  expiredCount: number;
  fromDate: string;
  toDate: string;
  byAgency: ReportAgencyRow[];
  byCenter: ReportCenterRow[];
  topIncomeSources: ReportIncomeSourceRow[];
}

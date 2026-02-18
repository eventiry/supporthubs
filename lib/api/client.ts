/**
 * API client for Support Hubs.
 * Uses fetch; optional getToken for authenticated requests.
 * Imports only from lib/types and lib/utils (not app).
 */

import type {
  LoginRequest,
  LoginResponse,
  SessionUser,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  HealthResponse,
  ContactSubmitPayload,
  ContactSubmitResponse,
  ClientSearchParams,
  ClientSearchResult,
  ClientCreatePayload,
  ClientUpdatePayload,
  ClientWithVouchers,
  Client,
  Agency,
  AgencyCreatePayload,
  AgencyUpdatePayload,
  FoodBankCenter,
  FoodBankCenterCreatePayload,
  FoodBankCenterUpdatePayload,
  VoucherListParams,
  VoucherCreatePayload,
  VoucherSummary,
  VoucherDetail,
  RedemptionPayload,
  RedeemResponse,
  ReportParams,
  ReportData,
  UserListParams,
  UserListItem,
  UserCreatePayload,
  UserUpdatePayload,
  OrganizationListItem,
  OrganizationCreatePayload,
  OrganizationUpdatePayload,
  Organization,
  UploadOrganizationLogoResponse,
  InvitationListItem,
  InvitationCreatePayload,
  JoinValidateResponse,
  JoinPayload,
  JoinResponse,
  TenantBrandingResponse,
  TenantBrandingUpdatePayload,
  PublicPlanItem,
  SubscriptionPlanListItem,
  BillingResponse,
  SubscriptionListItem,
  ContactSubmissionListItem,
  ContactSubmissionDetail,
  ContactRespondPayload,
  SubscriptionPlanUpdatePayload,
  SubscriptionPlanCreatePayload,
} from "@/lib/types";
import {
  ApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "./errors";

type GetToken = () => Promise<string | null> | string | null;

export class ApiClient {
  constructor(
    private baseUrl: string,
    private getToken?: GetToken
  ) {}

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    // In the browser use relative URL so the request always goes to current origin (tenant subdomain preserved)
    const url =
      typeof window !== "undefined"
        ? path
        : (this.baseUrl ? `${this.baseUrl.replace(/\/$/, "")}${path}` : path);
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    const headers: HeadersInit = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    };
    if (isFormData && (headers as Record<string, string>)["Content-Type"]) {
      delete (headers as Record<string, string>)["Content-Type"];
    }

    const token =
      this.getToken != null
        ? typeof this.getToken === "function"
          ? await (this.getToken as () => Promise<string | null>)()
          : this.getToken
        : null;
    if (token != null && token !== "") {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // required for Set-Cookie from login to be stored
    });

    if (!res.ok) {
      const body = await res.text();
      let message = body;
      try {
        const json = JSON.parse(body) as { message?: string; error?: string };
        message = json.message ?? json.error ?? body;
      } catch {
        // use body as message
      }
      if (res.status === 401) throw new UnauthorizedError(message);
      if (res.status === 403) throw new ForbiddenError(message);
      if (res.status === 404) throw new NotFoundError(message);
      if (res.status === 400) throw new ValidationError(message);
      throw new ApiError(message, res.status, undefined, "API_ERROR");
    }

    const text = await res.text();
    if (text.length === 0) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError("Invalid JSON response", res.status);
    }
  }

  /** GET /api/health */
  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/api/health", { method: "GET" });
  }

  /** POST /api/contact — public contact form. No auth. */
  contact = {
    submit: (payload: ContactSubmitPayload): Promise<ContactSubmitResponse> =>
      this.request<ContactSubmitResponse>("/api/contact", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  };

  auth = {
    /** POST /api/auth/login */
    login: (credentials: LoginRequest): Promise<LoginResponse> =>
      this.request<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      }),

    /** POST /api/auth/logout */
    logout: (): Promise<void> =>
      this.request<void>("/api/auth/logout", { method: "POST" }),

    /** GET /api/auth/session */
    getSession: (): Promise<SessionUser | null> =>
      this.request<SessionUser | null>("/api/auth/session", { method: "GET" }),

    /** POST /api/auth/forgot-password */
    forgotPassword: (payload: ForgotPasswordRequest): Promise<{ message: string }> =>
      this.request<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    /** POST /api/auth/reset-password */
    resetPassword: (payload: ResetPasswordRequest): Promise<{ message: string }> =>
      this.request<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    /** PATCH /api/auth/change-password (requires session) */
    changePassword: (payload: ChangePasswordRequest): Promise<{ message: string }> =>
      this.request<{ message: string }>("/api/auth/change-password", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
  };

  /** GET /api/clients — search (query params). Requires CLIENT_READ or CLIENT_CREATE. */
  clients = {
    search: (params: ClientSearchParams): Promise<ClientSearchResult[]> => {
      const sp = new URLSearchParams();
      if (params.firstName != null) sp.set("firstName", params.firstName);
      if (params.surname != null) sp.set("surname", params.surname);
      if (params.postcode != null) sp.set("postcode", params.postcode);
      if (params.noFixedAddress != null)
        sp.set("noFixedAddress", String(params.noFixedAddress));
      const q = sp.toString();
      return this.request<ClientSearchResult[]>(
        `/api/clients${q ? `?${q}` : ""}`,
        { method: "GET" }
      );
    },

    /** POST /api/clients — create. Requires CLIENT_CREATE. */
    create: (payload: ClientCreatePayload): Promise<Client> =>
      this.request<Client>("/api/clients", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    /** GET /api/clients/[id] — by id with recent vouchers. Requires CLIENT_READ. */
    get: (id: string): Promise<ClientWithVouchers> =>
      this.request<ClientWithVouchers>(`/api/clients/${encodeURIComponent(id)}`, {
        method: "GET",
      }),

    /** PATCH /api/clients/[id] — update. Requires CLIENT_UPDATE. */
    update: (id: string, payload: ClientUpdatePayload): Promise<Client> =>
      this.request<Client>(`/api/clients/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
  };

  /** GET /api/agencies — current user's agency (third_party) or all (admin). */
  agencies = {
    list: (): Promise<Agency[]> =>
      this.request<Agency[]>("/api/agencies", { method: "GET" }),
    get: (id: string): Promise<Agency> =>
      this.request<Agency>(`/api/agencies/${encodeURIComponent(id)}`, { method: "GET" }),
    create: (payload: AgencyCreatePayload): Promise<Agency> =>
      this.request<Agency>("/api/agencies", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: AgencyUpdatePayload): Promise<Agency> =>
      this.request<Agency>(`/api/agencies/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    delete: (id: string): Promise<{ message: string }> =>
      this.request<{ message: string }>(`/api/agencies/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
  };

  /** GET /api/centers — list food bank centers. POST requires USER_MANAGE. */
  centers = {
    list: (): Promise<FoodBankCenter[]> =>
      this.request<FoodBankCenter[]>("/api/centers", { method: "GET" }),
    get: (id: string): Promise<FoodBankCenter> =>
      this.request<FoodBankCenter>(`/api/centers/${encodeURIComponent(id)}`, { method: "GET" }),
    create: (payload: FoodBankCenterCreatePayload): Promise<FoodBankCenter> =>
      this.request<FoodBankCenter>("/api/centers", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: FoodBankCenterUpdatePayload): Promise<FoodBankCenter> =>
      this.request<FoodBankCenter>(`/api/centers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    delete: (id: string): Promise<{ message: string }> =>
      this.request<{ message: string }>(`/api/centers/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
  };

  /** Vouchers API. Requires VOUCHER_ISSUE / VOUCHER_VIEW_OWN / VOUCHER_VIEW_ALL as applicable. */
  vouchers = {
    list: (params?: VoucherListParams): Promise<VoucherSummary[]> => {
      const sp = new URLSearchParams();
      if (params?.status) sp.set("status", params.status);
      if (params?.clientId) sp.set("clientId", params.clientId);
      if (params?.code) sp.set("code", params.code);
      if (params?.fromDate) sp.set("fromDate", params.fromDate);
      if (params?.toDate) sp.set("toDate", params.toDate);
      const q = sp.toString();
      return this.request<VoucherSummary[]>(
        `/api/vouchers${q ? `?${q}` : ""}`,
        { method: "GET" }
      );
    },
    create: (payload: VoucherCreatePayload): Promise<VoucherSummary & { client?: { firstName: string; surname: string } }> =>
      this.request("/api/vouchers", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    get: (id: string): Promise<VoucherDetail> =>
      this.request<VoucherDetail>(`/api/vouchers/${encodeURIComponent(id)}`, {
        method: "GET",
      }),
    /** POST /api/vouchers/[id]/redeem — mark as fulfilled. Requires VOUCHER_REDEEM. */
    redeem: (id: string, payload: RedemptionPayload): Promise<RedeemResponse> =>
      this.request<RedeemResponse>(
        `/api/vouchers/${encodeURIComponent(id)}/redeem`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      ),
    /** PATCH /api/vouchers/[id] — invalidate (set status to expired). Only for issued vouchers. */
    invalidate: (id: string): Promise<{ message: string }> =>
      this.request<{ message: string }>(`/api/vouchers/${encodeURIComponent(id)}`, {
        method: "PATCH",
      }),
    /** DELETE /api/vouchers/[id] — only when voucher has no redemptions. */
    delete: (id: string): Promise<{ message: string }> =>
      this.request<{ message: string }>(`/api/vouchers/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
  };

  /** GET /api/reports — aggregated stats. Requires REPORTS_READ. */
  reports = {
    get: (params?: ReportParams): Promise<ReportData> => {
      const sp = new URLSearchParams();
      if (params?.fromDate) sp.set("fromDate", params.fromDate);
      if (params?.toDate) sp.set("toDate", params.toDate);
      const q = sp.toString();
      return this.request<ReportData>(
        `/api/reports${q ? `?${q}` : ""}`,
        { method: "GET" }
      );
    },
    /** Returns CSV blob URL for download. */
    getCsvUrl: (params?: Pick<ReportParams, "fromDate" | "toDate">): string => {
      const sp = new URLSearchParams();
      if (params?.fromDate) sp.set("fromDate", params.fromDate);
      if (params?.toDate) sp.set("toDate", params.toDate);
      sp.set("format", "csv");
      const base = this.baseUrl || (typeof window !== "undefined" ? "" : "http://localhost:3000");
      return `${base}/api/reports?${sp.toString()}`;
    },
  };

  /** Users API. Admin only (USER_MANAGE). */
  users = {
    list: (params?: UserListParams): Promise<UserListItem[]> => {
      const sp = new URLSearchParams();
      if (params?.role) sp.set("role", params.role);
      if (params?.agencyId) sp.set("agencyId", params.agencyId);
      const q = sp.toString();
      return this.request<UserListItem[]>(
        `/api/users${q ? `?${q}` : ""}`,
        { method: "GET" }
      );
    },
    create: (payload: UserCreatePayload): Promise<UserListItem> =>
      this.request<UserListItem>("/api/users", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    get: (id: string): Promise<UserListItem> =>
      this.request<UserListItem>(`/api/users/${encodeURIComponent(id)}`, {
        method: "GET",
      }),
    update: (id: string, payload: UserUpdatePayload): Promise<UserListItem> =>
      this.request<UserListItem>(`/api/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    disable: (id: string): Promise<void> =>
      this.request<void>(`/api/users/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
  };

  /** Platform admin: organizations (platform admin only). */
  platform = {
    /** GET /api/platform/config — platform admin only (subscriptionEnabled, etc.). */
    config: {
      get: (): Promise<{ subscriptionEnabled: boolean }> =>
        this.request<{ subscriptionEnabled: boolean }>("/api/platform/config", { method: "GET" }),
    },
    organizations: {
      list: (): Promise<OrganizationListItem[]> =>
        this.request<OrganizationListItem[]>("/api/platform/organizations", {
          method: "GET",
        }),
      create: (payload: OrganizationCreatePayload): Promise<Organization> =>
        this.request<Organization>("/api/platform/organizations", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      get: (id: string): Promise<Organization> =>
        this.request<Organization>(`/api/platform/organizations/${encodeURIComponent(id)}`, {
          method: "GET",
        }),
      update: (
        id: string,
        payload: OrganizationUpdatePayload
      ): Promise<Organization> =>
        this.request<Organization>(`/api/platform/organizations/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        }),
      /** Upload logo for this organization (platform admin). Uses FormData. */
      uploadLogo: (organizationId: string, file: File): Promise<UploadOrganizationLogoResponse> =>
        this.upload.organizationLogo(file, organizationId),
    },
    invitations: {
      list: (): Promise<InvitationListItem[]> =>
        this.request<InvitationListItem[]>("/api/platform/invitations", { method: "GET" }),
      create: (payload: InvitationCreatePayload): Promise<InvitationListItem> =>
        this.request<InvitationListItem>("/api/platform/invitations", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
    },
    plans: {
      list: (): Promise<SubscriptionPlanListItem[]> =>
        this.request<SubscriptionPlanListItem[]>("/api/platform/plans", { method: "GET" }),
      create: (payload: SubscriptionPlanCreatePayload): Promise<SubscriptionPlanListItem> =>
        this.request<SubscriptionPlanListItem>("/api/platform/plans", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      update: (
        id: string,
        payload: SubscriptionPlanUpdatePayload
      ): Promise<SubscriptionPlanListItem> =>
        this.request<SubscriptionPlanListItem>(`/api/platform/plans/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        }),
      delete: (id: string): Promise<{ success: boolean }> =>
        this.request<{ success: boolean }>(`/api/platform/plans/${encodeURIComponent(id)}`, {
          method: "DELETE",
        }),
    },
    subscriptions: {
      list: (): Promise<SubscriptionListItem[]> =>
        this.request<SubscriptionListItem[]>("/api/platform/subscriptions", { method: "GET" }),
    },
    contactSubmissions: {
      list: (): Promise<ContactSubmissionListItem[]> =>
        this.request<ContactSubmissionListItem[]>("/api/platform/contact-submissions", {
          method: "GET",
        }),
      get: (id: string): Promise<ContactSubmissionDetail> =>
        this.request<ContactSubmissionDetail>(
          `/api/platform/contact-submissions/${encodeURIComponent(id)}`,
          { method: "GET" }
        ),
      respond: (id: string, payload: ContactRespondPayload): Promise<{ success: boolean }> =>
        this.request<{ success: boolean }>(
          `/api/platform/contact-submissions/${encodeURIComponent(id)}/respond`,
          { method: "POST", body: JSON.stringify(payload) }
        ),
    },
  };

  /** Public plans (for pricing page). No auth. */
  plans = {
    list: (): Promise<PublicPlanItem[]> =>
      this.request<PublicPlanItem[]>("/api/plans", { method: "GET" }),
  };

  /** Public join (onboarding) — no auth. */
  join = {
    validate: (token: string): Promise<JoinValidateResponse> =>
      this.request<JoinValidateResponse>(`/api/join/validate?token=${encodeURIComponent(token)}`, {
        method: "GET",
      }),
    submit: (payload: JoinPayload): Promise<JoinResponse> =>
      this.request<JoinResponse>("/api/join", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    /** Upload logo during join (FormData: token, file). Returns { logoUrl }. */
    uploadLogo: (token: string, file: File): Promise<{ logoUrl: string }> => {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("file", file);
      return this.request<{ logoUrl: string }>("/api/join/upload-logo", {
        method: "POST",
        body: formData,
      });
    },
  };

  /** Tenant billing: current org subscription summary, subscribe to plan, Stripe portal. */
  billing = {
    get: (): Promise<BillingResponse> =>
      this.request<BillingResponse>("/api/billing", { method: "GET" }),
    subscribe: (planId: string): Promise<{ success?: boolean; url?: string }> =>
      this.request<{ success?: boolean; url?: string }>("/api/billing/subscribe", {
        method: "POST",
        body: JSON.stringify({ planId }),
      }),
    createPortalSession: (returnUrl?: string): Promise<{ url: string }> =>
      this.request<{ url: string }>("/api/billing/portal", {
        method: "POST",
        body: returnUrl ? JSON.stringify({ returnUrl }) : "{}",
      }),
  };

  /** Tenant branding. GET works on tenant subdomain (no auth); PATCH requires tenant admin. */
  tenant = {
    branding: {
      get: (): Promise<TenantBrandingResponse> =>
        this.request<TenantBrandingResponse>("/api/tenant/branding", { method: "GET" }),
      update: (payload: TenantBrandingUpdatePayload): Promise<TenantBrandingResponse> =>
        this.request<TenantBrandingResponse>("/api/tenant/branding", {
          method: "PATCH",
          body: JSON.stringify(payload),
        }),
    },
  };

  /** Upload organization logo (FormData). Platform admin: pass organizationId. Tenant admin: omit. */
  upload = {
    organizationLogo: (file: File, organizationId?: string): Promise<UploadOrganizationLogoResponse> => {
      const formData = new FormData();
      formData.append("file", file);
      if (organizationId != null && organizationId !== "") {
        formData.append("organizationId", organizationId);
      }
      return this.request<UploadOrganizationLogoResponse>("/api/upload/organization-logo", {
        method: "POST",
        body: formData,
      });
    },
  };
}

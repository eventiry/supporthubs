# Support Hubs → Multi-Tenant Platform Plan

**Purpose:** Turn Support Hubs into a tenant-capable platform that Ordafy can offer to multiple organizations (e.g. `joyscharity.supporthubs.org`), with platform admin, subscriptions, branding, and clear onboarding.  
**Status:** Plan only — implement after approval.

---

## 1. Vision and Goals

| Goal | Description |
|------|-------------|
| **Multi-tenant** | Multiple organizations use the same app, each on their own subdomain, with isolated data and branding. |
| **Platform owner (Ordafy)** | Owns `supporthubs.org`, manages platform, creates/approves organizations, controls billing and features. |
| **Tenant autonomy** | Each organization manages its own users, agencies, centers, clients, vouchers, and settings within its tenant. |
| **Subscription** | Tiered plans; platform admin can enable/disable subscription and pricing. |
| **Branding** | Tenants customize logo, name, colors, and key settings on their subdomain. |
| **Public site** | Marketing, pricing, contact, about, benefits — and a path from “contact” to “tenant onboarded”. |

---

## 2. Multi-Tenancy Architecture

### 2.1 Tenant identification

- **Mechanism:** Subdomain per tenant (e.g. `joyscharity.supporthubs.org`, `foodbank-xyz.supporthubs.org`).
- **Platform (Ordafy):** `supporthubs.org` or `app.supporthubs.org` — no tenant, platform admin only (or redirect to tenant selection).
- **Reserved subdomains:** e.g. `www`, `app`, `api`, `admin`, `platform` for platform/public/app entry.

**Why subdomains:** Clear separation, easy DNS/SSL (wildcard `*.supporthubs.org`), good for branding and “this is our instance” feel.

### 2.2 Data isolation

- **Model:** **Row-level tenant isolation** — add an `organizationId` (or `tenantId`) to all tenant-scoped tables.
- **Scope:** Every query in the app (and API) must filter by current tenant’s `organizationId`; platform admin can optionally query across tenants for support/reporting.
- **Not shared between tenants:** Agencies, centers, users (tenant users), clients, vouchers, referral details, redemptions, audit logs — all belong to one organization.
- **Shared (no tenant):** Organizations table, platform users (Ordafy staff), subscription/billing metadata, global config.

### 2.3 High-level data model (to add/change)

- **Organization (tenant)**  
  - `id`, `slug` (subdomain), `name`, `status` (pending | active | suspended | cancelled), `createdAt`, `updatedAt`.  
  - Branding: `logoUrl`, `primaryColor`, `secondaryColor`, `customDomain` (optional later).  
  - Settings: JSON or columns for feature flags, limits, etc.  
  - Billing: `subscriptionPlanId`, `subscriptionStatus`, `billingEmail`, etc. (see §4).

- **Existing tables**  
  - Add `organizationId` (FK to Organization) to: User, Agency, FoodBankCenter, Client, Voucher, ReferralDetails, Redemption, AuditLog (and any other tenant-scoped entity).  
  - Migrations: create Organization, add column, backfill (e.g. one default org for current data), then enforce NOT NULL and unique constraints per tenant where needed.

- **Platform users**  
  - Either: a `role` / `type` on User (e.g. `platform_admin` vs `tenant_user`) with `organizationId` null for platform admins, **or** a separate `PlatformUser` table.  
  - Recommendation: single `User` table with `organizationId` nullable; null = platform admin, non-null = tenant user. Role/permission model already supports “platform” vs “tenant” (e.g. only platform can create organizations).

### 2.4 Auth and session

- **Resolve tenant from request:** Middleware (or API layer) derives tenant from hostname (e.g. `joyscharity` from `joyscharity.supporthubs.org`), looks up Organization by `slug`, attaches `organizationId` (and org settings) to request/session.
- **Session:** Store `organizationId` (and optionally `organizationSlug`) in session so all subsequent requests are tenant-scoped; platform sessions have no tenant or a special “platform” context.
- **Login:** Only users belonging to that tenant (or platform admins when on platform domain) can log in on that subdomain; optionally redirect to correct subdomain if user has access to one tenant only.

---

## 3. Platform Admin vs Tenant Admin

| Capability | Platform admin (Ordafy) | Tenant admin (org) |
|------------|-------------------------|---------------------|
| Create / approve / suspend organizations | ✅ | ❌ |
| View all organizations and usage | ✅ | ❌ |
| Manage subscription and billing | ✅ | ❌ (or view own plan only) |
| Manage platform-wide settings | ✅ | ❌ |
| Access any tenant for support | ✅ (e.g. “impersonate” or view-only) | ❌ |
| Manage users/agencies/centers/vouchers | Within selected tenant | Within own tenant only |
| Branding and org settings | For any org | Own org only |
| Reports | Cross-tenant or per-tenant | Own tenant only |

- **Tenant admin:** A role inside an organization (e.g. “admin” or “org_admin”) that can manage that org’s users, agencies, centers, and settings — but not create other organizations or change billing.
- **RBAC:** Extend current permission model with platform-only permissions (e.g. `ORGANIZATION_CREATE`, `ORGANIZATION_MANAGE`, `BILLING_VIEW`, `SUBSCRIPTION_MANAGE`) and keep existing tenant-level permissions (e.g. `VOUCHER_ISSUE`, `USER_MANAGE`) scoped by `organizationId`.

---

## 4. Subscription and Tiered Pricing

### 4.1 When to enable

- **Feature flag:** e.g. `SUBSCRIPTION_ENABLED` in platform config. When off, all orgs are “unlimited” or on a single default plan; when on, plans and limits apply.
- Platform admin can turn this on once pricing and billing are ready.

### 4.2 Plan structure (conceptual)

- **Tiers:** e.g. Starter, Growth, Enterprise (names and limits TBD).
- **Per-tier attributes (examples):**
  - Number of users (or “unlimited”).
  - Number of agencies / centers.
  - Vouchers per month (or unlimited).
  - Features: e.g. reports, API access, custom domain, priority support.
- **Billing:** Monthly / annual; platform admin can record “manual” subscription (e.g. invoice offline) or integrate a provider (Stripe, etc.) later.

### 4.3 Data model (minimal for “plan first”)

- **SubscriptionPlan:** `id`, `name`, `slug`, `tier`, `limits` (JSON: users, agencies, vouchers_per_month, etc.), `priceMonthly`, `priceYearly`, `features` (JSON or table), `active`.
- **Organization:** `subscriptionPlanId`, `subscriptionStatus` (trialing | active | past_due | cancelled | none), `subscriptionStartedAt`, `subscriptionEndsAt`, `billingEmail`, optional `stripeCustomerId` (or similar) when you add Stripe.
- **Enforcement:** Before creating a user/agency/voucher (etc.), check org’s plan limits and `subscriptionStatus`; block or warn when over limit or inactive. Platform admin can override (e.g. grace period, or “unlimited” for one org).

### 4.4 Structured pricing page (public)

- **Content:** Table of plans (Starter, Growth, Enterprise) with price, limits, and feature list; CTA “Contact sales” or “Start free trial” or “Get started” linking to contact/onboarding.
- **Source of truth:** Either static copy (for now) or driven by `SubscriptionPlan` so platform admin can change prices/features without code deploy. Plan: support both (static first, then admin-editable).

---

## 5. Public Site Improvements

- **Pages to add/improve:**
  - **Pricing** — Tiered plans, feature comparison, CTAs (contact / sign up / book demo).
  - **Contact** — Form (name, email, org name, message) → email to Ordafy/sales; optional “I want to use Support Hubs” checkbox that pre-fills interest and can feed into “invite to onboard” flow.
  - **About us** — Mission, who runs the platform (Ordafy), who it’s for (food banks, charities).
  - **Platform benefits** — Clear value props: multi-tenant, voucher management, reporting, compliance, branding, support, etc.
- **Existing home:** Keep and refine; add links to Pricing, Contact, About, Benefits; ensure CTAs lead to contact or tenant onboarding.
- **SEO and clarity:** Consistent messaging, clear audience (organizations that run food banks / voucher schemes).

---

## 6. Tenant Branding (per subdomain)

- **Stored per Organization:**  
  `logoUrl`, `companyName` (or use `name`), `primaryColor`, `secondaryColor`; optional: favicon, footer text, support email.
- **Usage in app:**
  - **Logo:** Header/sidebar on tenant subdomain; public tenant landing (if any) and login page.
  - **Name:** Replace “Support Hubs” (or app name) in header, title, and emails for that tenant.
  - **Colors:** CSS variables or theme object injected from org settings; apply to header, buttons, links (and optionally full theme).
- **Scope:** Only when the request is in a tenant context (subdomain); platform domain keeps Ordafy branding.
- **Implementation note:** Load org settings once per request (middleware or layout), inject into React context or a small script so the shell (layout, header) renders with tenant branding; avoid FOUC by inlining critical theme or using a single class on body.

---

## 7. How Organizations Get Access (Onboarding)

Three options compared:

| Approach | Pros | Cons |
|----------|------|------|
| **A. Self-signup on portal** | Scalable, instant, no manual step. | Risk of abuse; need verification; may not fit “sales-led” or high-touch. |
| **B. Sales creates account** | Full control, high-touch. | Doesn’t scale; every new org = manual work; slow. |
| **C. Contact → email link → self-onboard → admin approve** | Balanced: scalable (self-serve) + controlled (approval). Clear audit trail; “invite” feels intentional. | One extra step (approval); need invite/onboard UI. |

**Recommendation:** **C (Contact → Invite → Onboard → Approve)** as the default, with optional **A** later for a “public signup” tier if desired.

### 7.1 Recommended flow (C)

1. **Contact:** Prospect fills Contact form (e.g. “We want to use Support Hubs”); platform receives email (and optionally stores in DB).
2. **Invite:** Platform admin creates an **invitation** (e.g. org name, subdomain slug, admin email, optional plan). System sends email with a **one-time link** (e.g. `https://supporthubs.org/onboard?token=...` or `https://supporthubs.org/join/org-name?token=...`).
3. **Onboard:** Recipient opens link (valid for 7–14 days); lands on **onboarding** page(s):
   - Set organization name, confirm subdomain, upload logo, set colors (optional).
   - Create first user (tenant admin): email, password.
   - Optional: accept terms; select plan if subscription is on.
4. **Create tenant:** On submit, backend creates Organization (status `pending` or `active`), default settings, and first user; subdomain becomes active (or after approval).
5. **Approve (optional):** If you want manual approval, Organization starts as `pending`; platform admin sees “Pending organizations” and clicks “Approve” (and optionally sets plan); then status → `active` and tenant can log in.
6. **First login:** Tenant admin goes to `https://<slug>.supporthubs.org`, logs in, completes setup (agencies, centers, etc.).

**Scalability and flexibility:**

- **Scalable:** Many orgs can be invited; they onboard themselves; only approval (if used) is manual.
- **Flexible:** You can add a “self-signup” path later (no invite token) for a specific plan or pilot; you can also keep a “sales creates org” path for enterprise (admin creates org + invite in one step).

### 7.2 Data to support invite flow

- **Invitation:** `id`, `email`, `organizationName`, `subdomainSlug`, `token` (unique), `expiresAt`, `status` (pending | used | expired), `createdBy` (platform user), `createdAt`. Optional: `subscriptionPlanId`, `customMessage`.
- **Usage:** On “Join” page with `?token=...`, validate token and expiry; pre-fill org name and subdomain; on submit, create Organization + first user and mark invitation used.

---

## 8. Implementation Phases (suggested order)

- **Phase 0 — Plan and design**  
  Finalize this doc, get sign-off, and optionally add wireframes for public pages and onboarding.

- **Phase 1 — Multi-tenancy foundation**  
  - Add Organization model and migrations; add `organizationId` to tenant-scoped tables; backfill one default org for current data.  
  - Resolve tenant from host in middleware; attach to request/session.  
  - Scope all existing queries and APIs by `organizationId`.  
  - Introduce platform vs tenant user (e.g. `organizationId` null = platform).

- **Phase 2 — Platform admin**  
  - Platform UI: list organizations, create org (manual), view/edit org, suspend/activate.  
  - RBAC: platform-only permissions; restrict tenant admin from platform actions.  
  - (Optional) “View as tenant” or read-only access to a tenant for support.

- **Phase 3 — Invitation and onboarding**  
  - Invitation CRUD and one-time link email.  
  - Public “Join” page (with token); onboarding form (org name, subdomain, first user, optional branding).  
  - Create Organization + first user on submit; optional “pending → approve” flow.

- **Phase 4 — Tenant branding**  
  - Org fields: logo, name, colors.  
  - Load in app shell and apply to header, theme, login.  
  - (Optional) Public “About this org” or tenant landing page.

- **Phase 5 — Public site**  
  - Pricing page (static or from plans).  
  - Contact form and About, Benefits; link from home.  
  - Contact submissions stored and/or emailed; optional “Request access” CTA that ties into invite flow.

- **Phase 6 — Subscriptions (when needed)**  
  - SubscriptionPlan and org subscription fields; platform toggle “subscription enabled”.  
  - Enforce limits in app; optional Stripe (or other) integration.  
  - Pricing page and admin “manage plan” for each org.

- **Phase 7 — Polish and scale**  
  - Custom domains (optional), advanced branding, self-signup path (optional), analytics, and ops runbooks.

---

## 9. Technical Considerations

- **Auth:** Session must include tenant context; login must validate user belongs to tenant (or is platform). Consider redirecting “wrong subdomain” to correct one if user has only one org.
- **DB:** All tenant-scoped queries must filter by `organizationId`; use a global middleware or repository layer to avoid mistakes. Consider RLS (row-level security) in Postgres for an extra safety net.
- **Env / config:** Subdomain → tenant resolution needs a single source of truth (e.g. `APP_DOMAIN=supporthubs.org`, subdomain = first label). Wildcard SSL for `*.supporthubs.org`.
- **Emails:** Invite and onboarding emails; use existing Resend/SMTP; templates should support tenant or platform context.
- **Value-adds later:** API for tenants, white-label mobile app, advanced reporting, integrations (e.g. accounting), compliance packs — can be tied to plan tiers.

---

## 10. Summary

- **Multi-tenant:** Subdomain per org; row-level isolation via `organizationId`; platform (Ordafy) on main domain.
- **Platform admin:** Manages orgs, billing, and platform settings; can approve onboarded orgs and optionally support tenants.
- **Subscriptions:** Plan and limits when feature is on; tiered pricing; enforce in app; optional Stripe later.
- **Public site:** Pricing, Contact, About, Benefits; contact feeds into invite/onboard flow.
- **Branding:** Per-org logo, name, colors on their subdomain only.
- **Access:** Prefer **Contact → Invite (email link) → Self-onboard → Admin approve**; add self-signup or sales-created orgs as needed.

Next step: confirm or adjust this plan, then break Phase 1 into concrete tasks and start implementation.

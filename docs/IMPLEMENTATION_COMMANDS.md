# Implementation Commands — Multi-Tenant Platform

Use these commands in order. Copy-paste each block (or the whole section) back to the AI to implement. Directory: **`supporthubs`** (not my-food-bank).

After each phase (or at the end), run: **type-check, lint, and production build** so the app stays production-ready with no type, lint, syntax, or runtime errors.

---

## Pre-flight (do once)

Use this so the AI knows the project path:

```
We are working in the application at: applications/supporthubs (renamed from my-food-bank). All paths and commands should use supporthubs as the project directory. Before making changes, run pnpm run type-check, pnpm run lint, and pnpm run build from the supporthubs directory and fix any errors so the app is production-ready.
```

---

## Phase 1 — Multi-tenancy foundation

Give these in order:

**1.1 — Add Organization model and migration**

```
In supporthubs, add multi-tenant support. Create the Organization (tenant) model in Prisma: id, slug (unique, for subdomain), name, status (enum: PENDING, ACTIVE, SUSPENDED, CANCELLED), logoUrl (optional), primaryColor (optional), secondaryColor (optional), createdAt, updatedAt. Add a migration. Do not add organizationId to other tables yet — just create the Organization model and run the migration.
```

**1.2 — Add organizationId to tenant-scoped tables**

```
In supporthubs, add organizationId (required FK to Organization) to these Prisma models: User, Agency, FoodBankCenter, Client, Voucher, ReferralDetails, Redemption, AuditLog. Create a migration. For existing data, create one default Organization (e.g. slug "default", name "Default Organization") and backfill all existing rows to use that organizationId. Ensure the migration is reversible where possible and the app still runs.
```

**1.3 — Tenant resolution middleware**

```
In supporthubs, add middleware (or API helper) that resolves the current tenant from the request hostname: parse subdomain from host (e.g. joyscharity from joyscharity.supporthubs.org), look up Organization by slug, attach organizationId (and org) to request/session. Use APP_DOMAIN env (e.g. supporthubs.org) to derive subdomain. Handle platform domain (no subdomain or reserved subdomains like www, app) as “no tenant” for platform admin. Do not break existing auth or routes.
```

**1.4 — Scope all queries by organizationId**

```
In supporthubs, scope all tenant-scoped data access by organizationId: ensure every Prisma query for Agency, FoodBankCenter, Client, Voucher, ReferralDetails, Redemption, AuditLog, and User (tenant users) filters by the current request’s organizationId. Update API routes and any server-side data fetches. Platform admin (when no tenant) should not see tenant data unless explicitly “viewing as” a tenant (that can be a later phase). After changes, run type-check, lint, and build and fix any errors.
```

**1.5 — Platform vs tenant user**

```
In supporthubs, support platform admin users: allow User.organizationId to be nullable; null means platform admin. Update auth/session to treat null organizationId as platform context. Ensure tenant login only allows users whose organizationId matches the request’s tenant. Add a platform-only permission (e.g. ORGANIZATION_VIEW or PLATFORM_ACCESS) and RBAC check so only platform users can access platform routes. Run type-check, lint, and build; fix any errors.
```

---

## Phase 2 — Platform admin

**2.1 — Platform admin UI (organizations list and create)**

```
In supporthubs, add a platform admin area (only when user is platform admin, e.g. organizationId null). Add a route like /dashboard/platform/organizations that lists all organizations (name, slug, status, createdAt). Add ability to create a new organization (name, slug, status) from the UI. Restrict these routes and API handlers to platform admin only. Run type-check, lint, and build; fix any errors.
```

**2.2 — Platform admin: view/edit organization and suspend**

```
In supporthubs, add platform admin pages to view and edit an organization (name, slug, status, logoUrl, primaryColor, secondaryColor) and to suspend or activate an organization. Add API routes for update and status change. Ensure only platform admins can access. Run type-check, lint, and build; fix any errors.
```

---

## Phase 3 — Invitation and onboarding

**3.1 — Invitation model and API**

```
In supporthubs, add an Invitation model in Prisma: email, organizationName, subdomainSlug, token (unique), expiresAt, status (PENDING, USED, EXPIRED), createdById (FK to User, platform admin), createdAt. Add API routes for platform admin to create an invitation (and send email with one-time link) and to list invitations. Use existing email (Resend/SMTP) to send the invite link. Run migration, type-check, lint, and build; fix any errors.
```

**3.2 — Public onboarding (join) page**

```
In supporthubs, add a public onboarding page (e.g. /join?token=...) that accepts the invitation token. Validate token and expiry; show a form to confirm organization name and subdomain, set first user (tenant admin) email and password, and optionally logo/colors. On submit, create the Organization (status PENDING or ACTIVE), create the first User (tenant admin) linked to that org, and mark the invitation USED. Redirect to the new tenant subdomain login or dashboard. Run type-check, lint, and build; fix any errors.
```

**3.3 — Platform admin: approve pending organization**

```
In supporthubs, add in platform admin UI a list of organizations with status PENDING and an “Approve” action that sets status to ACTIVE. Optionally allow setting a subscription plan when approving. Run type-check, lint, and build; fix any errors.
```

---

## Phase 4 — Tenant branding

**4.1 — Load and apply tenant branding**

```
In supporthubs, load the current organization’s branding (logoUrl, name, primaryColor, secondaryColor) when in tenant context and inject into the app layout (e.g. React context or layout props). Apply logo and organization name in the header/sidebar and login page; apply colors via CSS variables or theme. Ensure platform domain keeps default (Ordafy) branding. Run type-check, lint, and build; fix any errors.
```

**4.2 — Tenant admin: edit own branding**

```
In supporthubs, add a tenant settings (or organization settings) page where a tenant admin can edit their organization’s name, logo URL, and primary/secondary colors. Restrict to tenant admin and scope updates to the current organization only. Run type-check, lint, and build; fix any errors.
```

---

## Phase 5 — Public site (Pricing, Contact, About, Benefits)

**5.1 — Public pages: Pricing, Contact, About, Benefits**

```
In supporthubs, add or improve the public marketing site. Add: (1) Pricing page with tiered plans (e.g. Starter, Growth, Enterprise) and CTAs to contact or get started; (2) Contact page with a form (name, email, organization name, message) that submits to an API and sends email to platform/sales and optionally stores in DB; (3) About us page (mission, who runs the platform, who it’s for); (4) Platform benefits page (value props). Update the home page to link to Pricing, Contact, About, and Benefits. Run type-check, lint, and build; fix any errors.
```

---

## Phase 6 — Subscriptions (optional; when ready)

**6.1 — Subscription plans and org subscription fields**

```
In supporthubs, add SubscriptionPlan model (name, slug, tier, limits JSON, priceMonthly, priceYearly, active) and add to Organization: subscriptionPlanId (optional FK), subscriptionStatus (e.g. none, trialing, active, past_due, cancelled), billingEmail. Add a platform feature flag (e.g. SUBSCRIPTION_ENABLED in env or config). When enabled, enforce plan limits (e.g. max users, max vouchers per month) before creating resources; platform admin can override. Run migration, type-check, lint, and build; fix any errors.
```

**6.2 — Platform admin: manage plan per organization and pricing page**

```
In supporthubs, in platform admin allow assigning a subscription plan to an organization and viewing/editing subscription status. Update the public Pricing page to show plans from the database (or keep static if preferred). Run type-check, lint, and build; fix any errors.
```

---

## Final verification (run after implementation)

Give this at the end to ensure production readiness:

```
In supporthubs, run full production verification: (1) pnpm run type-check — fix any TypeScript errors; (2) pnpm run lint — fix any ESLint errors; (3) pnpm run build — fix any build, syntax, or type errors. Ensure there are no type errors, no lint errors, no syntax errors, and no runtime errors. The application must be fully production deployment ready.
```

---

## Quick reference — directory and scripts

- **Project directory:** `applications/supporthubs` or `c:\Users\Owner\Desktop\Eventiry\applications\supporthubs`
- **Type-check:** `cd supporthubs && pnpm run type-check`
- **Lint:** `cd supporthubs && pnpm run lint`
- **Build:** `cd supporthubs && pnpm run build`
- **Validate all:** `cd supporthubs && pnpm run validate` (if script exists)

Use these commands in sequence; after each phase (or after the final verification), the app should remain production-ready with no type, lint, syntax, or runtime errors.

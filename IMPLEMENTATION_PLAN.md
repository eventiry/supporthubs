# Support Hubs — Implementation Plan

**Purpose:** Phased command prompts to develop the app to **production deployment ready** with proper typing, no lint errors, no type errors, no runtime errors, and no syntax errors. Follow PROJECT_PLAN.md for requirements and §1.3 for platform structure (Prisma + lib/db, lib/api, lib/types, RBAC).

---

## Goals

- **Production ready:** No lint errors, no type errors, no runtime errors, no syntax errors.
- **Single repo:** Next.js (App Router) with API routes in `app/api/`, Prisma in `prisma/`, shared lib as in PROJECT_PLAN.md §1.2 and §1.3.
- **lib/db:** Prisma singleton (ordafy-style), server-only; used only in API routes and server code.
- **lib/types:** Single source of truth for all platform types and request/response DTOs.
- **lib/api:** Typed API client for the frontend calling `app/api/*`.
- **RBAC:** Permissions by role (admin, third_party, back_office); sidebar and routes gated by permission.

---

## Prerequisites

- Node.js (e.g. ≥20). Package manager: npm, yarn, or pnpm.
- PostgreSQL instance and `DATABASE_URL` for local and production.
- PROJECT_PLAN.md and this IMPLEMENTATION_PLAN.md in the repo.

---

## Phases and Command Prompts

Use these prompts **in order**. Each phase assumes the previous ones are done unless stated otherwise. When sharing with your assistant, say e.g. “Implement Phase 0 from IMPLEMENTATION_PLAN.md in my-food-bank.”

---

### Phase 0: Scaffold Next.js app, Prisma, and lib/db

**Prompt:**

> In my-food-bank, scaffold the app and database layer as in PROJECT_PLAN.md §1.2 and §1.3.1:
> 1. Create a Next.js app (App Router) with TypeScript, Tailwind CSS, and path alias `@/*` → `./*`. Include `app/layout.tsx`, `app/page.tsx` (simple landing or redirect), and empty route groups `app/(auth)/` and `app/(dashboard)/`.
> 2. Add Prisma: `prisma/schema.prisma` with PostgreSQL provider and `url = env("DATABASE_URL")`. Leave models empty for now or add a single `User` model with `id`, `email`, `createdAt` so migrations run. Add `prisma/migrations` (initial migration if you add User).
> 3. Add **lib/db**: create `lib/db/index.ts` that exports a singleton Prisma client (attach to `globalThis` in development to avoid multiple instances). Throw a clear error if imported in a context where `window` is defined (server-only). Optionally add connection string tuning and graceful disconnect on SIGINT/SIGTERM. Export `db`, `Prisma`, `PrismaClient` and commonly used types/enums from `@prisma/client`.
> 4. Add to root `package.json`: scripts `db:generate`, `db:push`, `db:migrate`, `db:migrate:deploy`, `db:studio`, `db:seed` (seed can be a no-op script for now). Add `.env.example` with `DATABASE_URL` and a note for `NEXTAUTH_SECRET` (or equivalent).
> 5. Run `pnpm build` (or npm/yarn equivalent) and `pnpm type-check`; fix any errors. Ensure no lint errors in new files.

---

### Phase 1: Prisma schema and lib/db

**Prompt:**

> In my-food-bank, implement the full database schema per PROJECT_PLAN.md §4 and keep lib/db aligned:
> 1. **prisma/schema.prisma** — Define: User (id, email, passwordHash, firstName, lastName, role enum: admin | third_party | back_office, agencyId optional, status, createdAt, updatedAt), Agency (id, name, contactPhone, contactEmail, ...), Client (id, firstName, surname, postcode optional, noFixedAddress boolean, address optional, yearOfBirth optional, createdAt, updatedAt, household composition fields or JSON), ReferralDetails (id, notes 400 chars, incomeSource, referralReasons JSON, ethnicGroup optional, householdByAge JSON, contactConsent, dietaryConsent, dietaryRequirements, moreThan3VouchersReason optional, ...), Voucher (id, code unique, clientId, agencyId, referralDetailsId, foodBankCenterId optional, issueDate, expiryDate, status enum: issued | redeemed | expired, issuedById, createdAt, updatedAt), FoodBankCenter (id, name, address, postcode, phone, email, canDeliver, ...), Redemption (id, voucherId, redeemedAt, redeemedById, centerId, failureReason optional), AuditLog (id, userId optional, action, entity, entityId, changes JSON, createdAt). Add relations and indexes. Use enums for role, voucher status, and audit action where appropriate.
> 2. Run `db:migrate` to create migrations. Update **lib/db/index.ts** to re-export any new Prisma types/enums used by the app.
> 3. Add a minimal **prisma/seed.ts** (or db:seed script): create at least one Admin user and one Agency (and optionally one third_party user linked to that agency) so login and RBAC can be tested. Use bcrypt for password hashing in seed.
> 4. Run `db:generate`, `db:push` or `db:migrate`, and `db:seed`. Run type-check and fix any errors in lib/db or Prisma usage.

---

### Phase 2: lib/types — single source of truth

**Prompt:**

> In my-food-bank, create **lib/types** as the single source of truth per PROJECT_PLAN.md §1.3.2:
> 1. Create `lib/types/index.ts` exporting: User, UserRole (admin | third_party | back_office), Agency, Client, Voucher, VoucherStatus, ReferralDetails, FoodBankCenter, Redemption, AuditLog (mirror or re-export from Prisma where possible). Add request/response types: LoginRequest, LoginResponse, SessionUser (id, email, role, agencyId?), PaginatedResponse<T>, ClientSearchParams, ClientSearchResult, VoucherCreatePayload, VoucherSummary, and any other DTOs needed for the API and UI. Include auth types used by login/session.
> 2. Ensure no circular dependencies: lib/types must not import from lib/db or app. Run type-check and fix any errors in lib/types.

---

### Phase 3: lib/utils

**Prompt:**

> In my-food-bank, create **lib/utils** per PROJECT_PLAN.md §1.3.2:
> 1. Add `lib/utils/index.ts` exporting: getErrorMessage(error: unknown), formatDate(date: Date | string), formatDateWithTime(date: Date | string), validatePostcode(value: string) for UK postcode format, and a helper to validate required fields (e.g. object with required keys). Add any other pure helpers that will be used across the app (e.g. cn for classnames if using Tailwind). Implement only what is needed; keep functions typed and side-effect free.
> 2. Run type-check and lint on lib/utils; fix any issues.

---

### Phase 4: lib/api client and API errors

**Prompt:**

> In my-food-bank, create the API client and error types per PROJECT_PLAN.md §1.3.2 and §1.3.4:
> 1. **lib/api/errors.ts** — Define ApiError (base), UnauthorizedError, ForbiddenError, NotFoundError, ValidationError with status codes and optional message/code. Export from lib/api.
> 2. **lib/api/client.ts** — ApiClient class that takes baseUrl and optional getToken(): Promise<string | null>. Use fetch for requests; on 4xx/5xx parse JSON error body and throw appropriate error from errors.ts. Add typed methods: auth.login(credentials), auth.logout(), auth.getSession(), health(). Return types from lib/types (LoginResponse, SessionUser, etc.). Do not import from app.
> 3. **lib/api/index.ts** — Export createApiClient(baseUrl?, getToken?) and a singleton `api` with baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? '' : 'http://localhost:3000') so the same app serves the API. Export errors and client.
> 4. Run type-check; fix any errors. Ensure lib/api imports only lib/types and lib/utils.

---

### Phase 5: Auth API routes and session

**Prompt:**

> In my-food-bank, implement auth API routes and server-side session per PROJECT_PLAN.md:
> 1. **app/api/auth/login/route.ts** — POST: accept LoginRequest (email, password), verify with db.user.findUnique and bcrypt, create session (e.g. cookie-based or store session id in cookie and session payload in server cache/DB). Return LoginResponse with user summary (id, email, role, agencyId). Return 401 on invalid credentials.
> 2. **app/api/auth/logout/route.ts** — POST: clear session cookie (and invalidate server session if stored).
> 3. **app/api/auth/session/route.ts** — GET: read session from cookie/cache, return current user or 401. Use lib/db only in API routes.
> 4. **lib/auth** — Add getSession(): Promise<SessionUser | null> (e.g. read cookie and validate; can call same logic as session route). Add protectRoute(): redirect or throw if no session. Optionally add signIn/signOut helpers that call the API or set cookies. Do not expose lib/db to the client; auth helpers used from server components or API only can use db for session lookup if needed.
> 5. Run type-check and lint. Ensure no runtime errors when calling POST /api/auth/login and GET /api/auth/session with valid/invalid credentials.

---

### Phase 6: Auth UI and login page

**Prompt:**

> In my-food-bank, implement the login page and auth UI:
> 1. **app/(auth)/layout.tsx** — Simple centred layout for auth pages (e.g. card in the middle, no sidebar).
> 2. **app/(auth)/login/page.tsx** — Login form: email, password, submit. On submit call api.auth.login(); on success store session (cookie set by API or client-side redirect with session), redirect to dashboard (e.g. /dashboard). Show validation and error message using getErrorMessage. Use lib/api for the request.
> 3. **app/page.tsx** — If unauthenticated show a link to /login; if authenticated redirect to /dashboard. Use getSession (from server) or session API to decide.
> 4. Run type-check and lint. Manually verify login flow and redirect; no runtime errors.

---

### Phase 7: RBAC — permissions, useRbac, and context

**Prompt:**

> In my-food-bank, implement RBAC per PROJECT_PLAN.md §2 and §7:
> 1. **lib/rbac/permissions.ts** — Define Permission enum (e.g. DASHBOARD_READ, CLIENT_READ, CLIENT_CREATE, CLIENT_UPDATE, VOUCHER_ISSUE, VOUCHER_VIEW_OWN, VOUCHER_VIEW_ALL, VOUCHER_REDEEM, REPORTS_READ, USER_MANAGE, SETTINGS_READ, AUDIT_VIEW). Implement getPermissionsForRole(role: UserRole): Permission[] mapping: admin = all; third_party = dashboard, client read/create/update, voucher issue, voucher view own; back_office = dashboard, voucher redeem, voucher view, client read (for referral criteria). Export Permission and getPermissionsForRole.
> 2. **hooks/use-rbac.ts** (or lib/hooks/use-rbac.ts) — useRbac(): get session (e.g. via React context or fetch /api/auth/session), then return { hasPermission(permission), role, user, isLoading }. Use getPermissionsForRole(role) to compute allowed permissions.
> 3. **lib/contexts/session-context.tsx** — SessionProvider: fetch session on mount, provide { user, role, isLoading } (and optionally hasPermission) to children. Use in dashboard layout so sidebar and guards can use it.
> 4. **lib/rbac/guard.tsx** — RbacRouteGuard: component that takes required permission(s), checks useRbac().hasPermission, redirects to /dashboard or shows “Forbidden” if not allowed. Use in dashboard routes that need permission checks.
> 5. Run type-check and lint; fix any errors.

---

### Phase 8: Dashboard layout, sidebar, and placeholder pages

**Prompt:**

> In my-food-bank, implement the dashboard shell and navigation per PROJECT_PLAN.md §9 and §1.3.3:
> 1. **app/(dashboard)/layout.tsx** — Require auth (redirect to /login if no session). Render a dashboard shell: top bar (logo, user email, logout) and left sidebar. Sidebar items filtered by RBAC: Dashboard (home), Clients (CLIENT_READ), Issue voucher (VOUCHER_ISSUE), Redeem voucher (VOUCHER_REDEEM), Reports (REPORTS_READ), Users (USER_MANAGE), Settings (SETTINGS_READ). Use SessionProvider and useRbac; show only links the user has permission for.
> 2. **components/layout/dashboard-shell.tsx** — Layout component with sidebar + main content area. Accept children for main content.
> 3. **components/layout/sidebar.tsx** — Nav links based on permissions; highlight active route. Use Next.js Link.
> 4. **components/layout/header.tsx** — Top bar with user info and logout (call api.auth.logout then redirect to /login).
> 5. Create placeholder pages: **app/(dashboard)/page.tsx** (dashboard home), **app/(dashboard)/clients/page.tsx**, **app/(dashboard)/vouchers/page.tsx**, **app/(dashboard)/vouchers/issue/page.tsx**, **app/(dashboard)/redeem/page.tsx**, **app/(dashboard)/reports/page.tsx**, **app/(dashboard)/users/page.tsx**, **app/(dashboard)/settings/page.tsx**. Each can be a simple heading and “Coming soon” or minimal content so navigation works.
> 6. Run type-check and lint. Verify that after login, dashboard and sidebar show correct items by role (admin sees all; third_party sees clients + issue voucher; back_office sees redeem + clients for viewing).

---

### Phase 9: Clients API and client search/create UI

**Prompt:**

> In my-food-bank, implement client search and create per PROJECT_PLAN.md §3.A and reference 1OF6.png, 2of6.png:
> 1. **app/api/clients/route.ts** — GET: query params firstName?, surname?, postcode?, noFixedAddress? (optional boolean). Search clients (surname + postcode or noFixedAddress required). Return list with last voucher issued/fulfilled and voucher count in last 6 months (for duplicate detection). Enforce RBAC: only allowed if user has CLIENT_READ or CLIENT_CREATE. POST: create new client (body: firstName, surname, postcode or noFixedAddress, address?, yearOfBirth?, household?). Validate required fields and postcode format (lib/utils). Enforce CLIENT_CREATE. Return created client.
> 2. **app/api/clients/[id]/route.ts** — GET: client by id with recent vouchers (for “Expand details”). PATCH: update client (CLIENT_UPDATE). Return 404 if not found.
> 3. **lib/api** — Add clients.search(params), clients.create(payload), clients.get(id), clients.update(id, payload). Use types from lib/types.
> 4. **app/(dashboard)/clients/page.tsx** — Step 1 style: form with first name, surname, postcode (or “No fixed address” checkbox). Search button calls clients.search(); display results in a table: name, postcode, last voucher issued, last voucher fulfilled, vouchers in last 6 months (highlight in red if > 3). Each row: “Issue voucher” (link to voucher issue with clientId), “Expand details” (link to client detail or inline expand). Link “Create new client record” to new client form.
> 5. **app/(dashboard)/clients/new/page.tsx** — Form to create client (same fields as API). On success redirect to client detail or back to search with message.
> 6. **app/(dashboard)/clients/[id]/page.tsx** — Show client details and “Update client details” link; show recent voucher history.
> 7. Run type-check and lint. Test search (with and without postcode), create client, and list with duplicate-style display (vouchers in last 6 months).

---

### Phase 10: Voucher issuance API and wizard (Steps 1–6)

**Prompt:**

> In my-food-bank, implement voucher issuance per PROJECT_PLAN.md §3.B and reference screens 1OF6–6of6:
> 1. **app/api/vouchers/route.ts** — GET: list vouchers (third_party: only own agency; admin: all). Query params: status?, clientId?, fromDate?, toDate?. POST: create voucher (body: clientId, referralDetails, voucherInfo, foodBankCenterId?, collectionNotes?, etc.). Generate unique code format E-XXXXX-XXXXXX, set expiry 14 days from issue. Validate 3-voucher limit in 6 months (if exceeded, require justification in payload). Enforce VOUCHER_ISSUE; set issuedById and agencyId from session. Return created voucher.
> 2. **app/api/vouchers/[id]/route.ts** — GET: voucher by id with client, referral details, agency, center. Enforce VOUCHER_VIEW_OWN or VOUCHER_VIEW_ALL by role/agency.
> 3. **app/api/agencies/route.ts** — GET: current user’s agency (for third_party) or list (for admin). Used to auto-populate referral agency info.
> 4. **app/api/centers/route.ts** — GET: list food bank centers (for selection in Step 5).
> 5. **lib/api** — Add vouchers.list(params), vouchers.create(payload), vouchers.get(id), agencies.getMine(), centers.list().
> 6. **app/(dashboard)/vouchers/issue/[[...step]]/page.tsx** — Multi-step wizard (Steps 1–6). Step 1: client search/select (reuse clients search or inline). Step 2: client details verification (read-only + link to update client). Step 3–4: reason for referral (income source, financial/personal/health reasons, notes 400 chars, privacy consent, >3 vouchers reason if applicable). Step 4 cont.: voucher info (date issued, agency auto-filled, ethnic group optional, household by age, contact consent, dietary consent/requirements, parcel notes). Step 5: food bank centre selection, collection vs delivery, contact consent, collection notes. Step 6: confirmation, display generated code and “View and print voucher” (link to voucher print view). Use breadcrumb “Step X of 6”. Store wizard state in URL (e.g. ?step=2) or React state; on final step POST vouchers.create() then redirect to Step 6 confirmation with voucher id.
> 7. **app/(dashboard)/vouchers/[id]/page.tsx** — Voucher detail and print-friendly view (content that appears on printed voucher only; hide internal-only fields). Include food bank contact info.
> 8. **app/(dashboard)/vouchers/page.tsx** — List vouchers (from api), filter by status; link to issue and to [id].
> 9. Run type-check and lint. Test full flow: search client → select → fill referral → voucher info → center → confirm → create voucher; verify code format and expiry; test print view.

---

### Phase 11: Voucher redemption API and UI

**Prompt:**

> In my-food-bank, implement voucher redemption per PROJECT_PLAN.md §3.C:
> 1. **app/api/vouchers/[id]/redeem/route.ts** — POST: body { centerId, failureReason? }. Validate voucher exists, status = issued, not expired. Create Redemption record, set voucher status to redeemed. Enforce VOUCHER_REDEEM. Return updated voucher and redemption.
> 2. **app/api/redemptions/route.ts** (optional) — GET: list redemptions for reporting (admin/back_office).
> 3. **lib/api** — Add vouchers.redeem(id, payload).
> 4. **app/(dashboard)/redeem/page.tsx** — Search vouchers by code or client name or date (reuse or call vouchers list API with params). Display matching voucher(s); select one, show full referral criteria and dietary/parcel notes. Button “Mark as fulfilled”: select center, optional failure reason, then POST vouchers.redeem(id, { centerId, failureReason }). Show success and updated status.
> 5. Run type-check and lint. Test redeem flow and failure reason path.

---

### Phase 12: Reports API and reports page (admin)

**Prompt:**

> In my-food-bank, implement basic reporting per PROJECT_PLAN.md §3.D:
> 1. **app/api/reports/route.ts** — GET: query params fromDate?, toDate?. Return aggregated data: vouchers issued vs redeemed, top referral reasons, counts by agency (or by center). Enforce REPORTS_READ. Return JSON (and optionally support ?format=csv for CSV export).
> 2. **lib/api** — Add reports.get(params).
> 3. **app/(dashboard)/reports/page.tsx** — Date range picker, call reports.get(), display key metrics (issued vs redeemed, top reasons, table or charts). Add “Export CSV” if API supports it. Restrict to users with REPORTS_READ.
> 4. Run type-check and lint.

---

### Phase 13: User management and settings (admin)

**Prompt:**

> In my-food-bank, implement minimal user management and settings for admin:
> 1. **app/api/users/route.ts** — GET: list users (admin only; USER_MANAGE). Optional filter by role or agency. Return list with id, email, role, agencyId, status. POST: create user (admin only; body: email, password, role, agencyId if third_party). Hash password with bcrypt.
> 2. **app/api/users/[id]/route.ts** — GET, PATCH (update role, status, agency), DELETE (disable user). Enforce USER_MANAGE.
> 3. **lib/api** — Add users.list(), users.create(), users.get(id), users.update(id, payload), users.disable(id).
> 4. **app/(dashboard)/users/page.tsx** — List users, link to edit; form to create user (email, password, role, agency). Only show if USER_MANAGE.
> 5. **app/(dashboard)/settings/page.tsx** — Placeholder or minimal system settings (e.g. app name, maintenance message). Enforce SETTINGS_READ. Optional: **app/api/audit/route.ts** GET for audit logs (AUDIT_VIEW) and a simple audit log table on a settings subpage.
> 6. Run type-check and lint.

---

### Phase 14: Audit logging and validation polish

**Prompt:**

> In my-food-bank, add audit logging and tighten validation:
> 1. **lib/audit** (or lib/audit.ts) — Helper createAuditLog(db, { userId, action, entity, entityId, changes? }). Call from API routes on create/update/delete for clients, vouchers, redemptions, users. Use AuditLog model from Prisma.
> 2. In **app/api** routes: on mutation (create client, create/update voucher, redeem, create/update user) call createAuditLog with appropriate action and entity. Ensure no sensitive data in `changes` (e.g. no password).
> 3. **Validation:** Ensure 3-voucher-in-6-months rule is enforced in voucher creation (return 400 with message if exceeded and no justification). Enforce notes max 400 chars and postcode format where applicable. Add Zod (or similar) schemas for request bodies and use in API routes if not already present.
> 4. Run type-check and lint; fix any issues.

---

### Phase 15: Lint, type-check, build, and production checklist

**Prompt:**

> In my-food-bank, make the app production deployment ready:
> 1. Run `pnpm type-check` (or tsc --noEmit). Fix every type error; avoid `any` unless justified and commented.
> 2. Run `pnpm lint` (or next lint / eslint). Fix every lint error (unused imports/variables, exhaustive-deps, etc.).
> 3. Run `pnpm build`. Fix any build errors (missing env, wrong paths, server-only code in client components). Ensure .env.example documents DATABASE_URL, NEXTAUTH_SECRET (or session secret), and NEXT_PUBLIC_APP_URL if used.
> 4. Add **CHECKLIST.md** (or a “Production checklist” section in README): list required env vars; confirm no type/lint/runtime/syntax errors; note DB migrations (db:migrate:deploy) and seed for first deploy; optional HTTPS and session cookie settings.
> 5. Optional: add a simple health check route GET **app/api/health/route.ts** that returns { ok: true } (and optionally checks DB connectivity) for load balancers or monitoring.

---

## Order of Execution

| Phase | Description |
|-------|-------------|
| 0 | Scaffold Next.js, Prisma, lib/db, scripts, .env.example |
| 1 | Full Prisma schema, migrations, seed, lib/db re-exports |
| 2 | lib/types (single source of truth) |
| 3 | lib/utils |
| 4 | lib/api client + errors |
| 5 | Auth API routes + lib/auth session |
| 6 | Auth UI and login page |
| 7 | RBAC: permissions, useRbac, context, guard |
| 8 | Dashboard layout, sidebar, placeholder pages |
| 9 | Clients API and client search/create UI |
| 10 | Voucher issuance API and wizard (Steps 1–6) |
| 11 | Voucher redemption API and UI |
| 12 | Reports API and reports page |
| 13 | User management and settings (admin) |
| 14 | Audit logging and validation polish |
| 15 | Lint, type-check, build, production checklist |

---

## Notes

- **Single source of truth:** All shared types in `lib/types`. Prisma types can be re-exported or mirrored there.
- **API base URL:** One app; use relative `/api` in the browser; singleton `api` can use `NEXT_PUBLIC_APP_URL` or localhost for server-side calls.
- **RBAC:** Permission enum + getPermissionsForRole(role); sidebar and RbacRouteGuard use hasPermission(permission).
- **Wizard state:** Steps 1–6 can use URL search params (e.g. ?step=2&clientId=…) or React state; ensure back/forward and refresh behave correctly.
- **Print view:** Voucher print page should hide nav/sidebar and show only voucher content and food bank contact (PROJECT_PLAN.md §5).

You can share this document with your assistant and say: “Implement Phase 0 from IMPLEMENTATION_PLAN.md in my-food-bank,” then “Implement Phase 1,” and so on until Phase 15.

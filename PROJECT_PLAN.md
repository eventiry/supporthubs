# Support Hubs — Project Plan

**Document purpose:** Plan for a single-repo Next.js application with integrated API backend. This document captures requirements, architecture, and implementation order **before** any code is written.

**Reference:** Requirements and screenshots from the Trussell Trust–style food bank data system (client search, voucher issuance wizard Steps 1–6, redemption, reporting).

---

## 1. Project Overview

### 1.1 Tech Stack (Proposed)

| Layer        | Choice                          | Notes                                      |
|-------------|----------------------------------|--------------------------------------------|
| Framework   | Next.js (App Router)             | Single repo, server + API routes           |
| API         | Next.js Route Handlers (`/api/*`)| Backend included in same repo              |
| Data        | **PostgreSQL + Prisma**          | Same approach as ordafy-application        |
| Auth        | TBD (e.g. NextAuth / custom)     | Session-based, role-aware                  |
| UI          | React + Tailwind CSS             | Responsive, print-friendly views           |

### 1.2 Repo Structure (Target)

```
my-food-bank/
├── app/                    # Next.js App Router
│   ├── (auth)/              # Login, role selection
│   ├── (dashboard)/         # Role-based dashboard + modules
│   ├── api/                 # API route handlers (backend)
│   └── layout.tsx
├── lib/                     # Shared logic
│   ├── api/                 # API client for frontend
│   ├── auth/                # Auth helpers, session
│   ├── db/                  # DB client (Prisma singleton)
│   ├── types/               # Shared TypeScript types
│   ├── rbac/                # Permissions, guards
│   └── utils/
├── prisma/                  # Schema and migrations (ordafy-style)
│   ├── schema.prisma
│   └── migrations/
├── components/              # UI components
├── PROJECT_PLAN.md          # This file
└── package.json
```

### 1.3 Comprehensive Platform Structure

This section defines the **full platform structure** and how it aligns with the ordafy-application DB and Next.js patterns (single repo; no internal packages).

#### 1.3.1 Database approach (same as ordafy-application)

- **Engine:** PostgreSQL.
- **ORM:** Prisma. Schema and migrations live in **`prisma/`** at repo root (single-repo equivalent of ordafy’s `packages/db/prisma`).
- **Client:** A single **`lib/db`** module (equivalent of ordafy’s `@ordafy/db`):
  - Exports a **singleton** `db` (PrismaClient) to avoid multiple instances and connection exhaustion.
  - In development, attach the client to `globalThis` so hot reload does not create new instances.
  - **Server-only:** Throw a clear error if `lib/db` is imported in client components; data access goes via API routes only from the browser.
  - Optional: connection string tuning (e.g. `connect_timeout`, `statement_timeout`, `application_name`) and graceful shutdown on SIGINT/SIGTERM.
- **Scripts** (in root `package.json`, same workflow as ordafy):
  - `db:generate` — `prisma generate`
  - `db:push` — `prisma db push`
  - `db:migrate` — `prisma migrate dev`
  - `db:migrate:deploy` — `prisma migrate deploy` (production)
  - `db:studio` — `prisma studio`
  - `db:seed` — run seed script (e.g. `tsx prisma/seed.ts` or similar)
- **Environment:** `DATABASE_URL` in `.env` (and `.env.example`); Next.js and Prisma CLI both read from project root.

#### 1.3.2 Directory map and responsibilities

| Path | Purpose |
|------|--------|
| **app/** | Next.js App Router: pages, layouts, route segments. |
| **app/(auth)/** | Auth route group: login, logout, role selection (if needed). No dashboard shell. |
| **app/(dashboard)/** | Authenticated dashboard: layout with top nav + sidebar (role-based), main content. Child routes: admin, client search, voucher wizard, redemption, reports, user management, settings. |
| **app/api/** | API route handlers (backend). Structure mirrors domains: e.g. `api/auth/`, `api/clients/`, `api/vouchers/`, `api/redemptions/`, `api/agencies/`, `api/centers/`, `api/reports/`, `api/users/`, `api/audit/`. All server-side; import `db` from `@/lib/db` only here (or in server components). |
| **app/layout.tsx** | Root layout (fonts, providers, global UI). |
| **lib/db/** | Prisma client singleton and re-exports. Entry: `lib/db/index.ts` (or `lib/db.ts`) exporting `db`, `Prisma`, `PrismaClient`, and commonly used types/enums. No Prisma schema here; schema stays in `prisma/schema.prisma`. |
| **lib/api/** | Frontend API client: typed methods that call `app/api/*` (e.g. `clients.search()`, `vouchers.create()`). Used by client components and server components that need to call own API. Single source for base URL and auth token injection. |
| **lib/auth/** | Session helpers, getSession, protectRoute, optional NextAuth or custom auth integration. Role and agency resolution for RBAC. |
| **lib/types/** | Shared TypeScript types and enums (single source of truth). Can mirror or re-export from Prisma where appropriate; request/response DTOs and UI-specific types live here. |
| **lib/rbac/** | Permissions (e.g. enum or const map), permission checks, route guards. Role-based menu/sidebar visibility. |
| **lib/utils/** | Pure helpers: formatDate, formatPostcode, getErrorMessage, validation helpers, etc. |
| **components/** | Reusable UI: `ui/` (buttons, inputs, cards), `layout/` (sidebar, header, dashboard shell), `wizard/` (voucher steps), `tables/`, etc. |
| **prisma/** | `schema.prisma` (PostgreSQL provider, DATABASE_URL), `migrations/`, optional `seed.ts`. |

#### 1.3.3 App route structure (key pages)

```
app/
├── layout.tsx
├── page.tsx                     # Public landing or redirect
├── (auth)/
│   ├── layout.tsx               # Auth layout (centred card, etc.)
│   ├── login/
│   │   └── page.tsx
│   └── logout/                  # or handled via API + redirect
├── (dashboard)/
│   ├── layout.tsx               # Dashboard shell (sidebar, nav, RBAC)
│   ├── page.tsx                 # Role-specific dashboard home
│   ├── clients/
│   │   ├── page.tsx             # Client search / create (Step 1 entry)
│   │   ├── [id]/
│   │   │   └── page.tsx         # Client details / edit
│   │   └── new/
│   │       └── page.tsx         # New client
│   ├── vouchers/
│   │   ├── page.tsx             # List / search (third-party: own only)
│   │   ├── issue/
│   │   │   └── [[...step]]/
│   │   │       └── page.tsx     # Wizard Steps 1–6 (optional catch-all)
│   │   └── [id]/
│   │       └── page.tsx         # Voucher detail / print
│   ├── redeem/
│   │   └── page.tsx             # Back office: voucher search & redeem
│   ├── reports/
│   │   └── page.tsx             # Admin: analytics, exports
│   ├── users/
│   │   └── page.tsx             # Admin: user/agency management
│   └── settings/
│       └── page.tsx             # Admin: system settings
└── api/
    ├── auth/
    │   ├── login/route.ts
    │   ├── logout/route.ts
    │   └── session/route.ts
    ├── clients/route.ts         # GET search, POST create
    ├── clients/[id]/route.ts    # GET, PATCH
    ├── vouchers/route.ts        # GET list, POST create (wizard submit)
    ├── vouchers/[id]/route.ts   # GET one
    ├── vouchers/[id]/redeem/route.ts
    ├── agencies/route.ts        # GET (for current user's agency)
    ├── centers/route.ts         # GET food bank centres
    ├── reports/route.ts         # Admin only
    ├── users/route.ts           # Admin only
    └── ...
```

#### 1.3.4 Data flow (aligning with ordafy)

- **Browser** → `lib/api` (typed client) → **Next.js API routes** (`app/api/*`) → **`lib/db`** (Prisma) → **PostgreSQL**.
- **Server components** can call `lib/db` directly for read-only or use API for consistency; **client components** must use `lib/api` only.
- **Auth:** Session (cookie or token) resolved in middleware or in API routes; role and agency passed into RBAC and into DB queries (e.g. filter vouchers by agency for third_party).

#### 1.3.5 Config and environment

- **Root:** `package.json`, `tsconfig.json`, `next.config.ts`, `.env`, `.env.example`, `.gitignore`.
- **Path alias:** `@/*` → `./*` so that `@/lib/db`, `@/lib/api`, `@/lib/types`, `@/components` resolve from project root.
- **.env.example:** `DATABASE_URL`, `NEXTAUTH_SECRET` (or equivalent), optional `NEXT_PUBLIC_APP_URL`.

---

## 2. Access Levels & Permissions

### 2.1 Admin Level (Full Access)

- Manage all users and access levels
- Create/disable third-party and back-office accounts
- Run comprehensive reports and analytics
- View all voucher transactions
- System configuration and settings
- Audit logs access

### 2.2 Third-Party Level (Referral Agencies)

- Search existing clients (Step 1)
- Create new client records
- Issue new vouchers (Steps 2–6 process)
- View own issued vouchers only
- **Cannot** redeem vouchers
- Limited to own agency’s referrals

### 2.3 Back Office Level (Food Bank Staff)

- Search and redeem vouchers
- View full client history and referral criteria
- Update fulfillment status
- Manage inventory/parcel preparation
- View dietary requirements and special notes
- **Cannot** create new vouchers

---

## 3. Core Dashboard Components

### 3.A Client Management Module

| Feature | Description | Reference |
|--------|-------------|-----------|
| Search interface | Name, surname, postcode search | 1OF6.png |
| No fixed address | Option when client has no fixed address | 1OF6.png |
| Duplicate detection | Show similar records with last voucher dates; prevent duplicates | 2of6.png |
| Client details | Display with history; “Update client details” link | 2of6.png, 3of6.png (Step 2) |

### 3.B Voucher Issuance Flow (Third-Party Access)

Multi-step wizard (Steps 1–6). Third-party only.

| Step | Name | Main elements | Reference |
|------|------|----------------|-----------|
| 1 | Search for client | Surname + postcode or “no fixed address”; Search / Clear | 1OF6.png |
| 2 | Client details | Verify/display client; “Update client details” | 2of6.png, 3of6.png |
| 3 | Referral information | Reason for referral (see below) | 3of6a–3of6f |
| 4 | Reason for referral (cont.) | Income source, voucher info, ethnic group, household, consent | 4of6a–4of6d |
| 5 | Food bank centres | Collection vs delivery; contact consent; nearest centre; collection notes | 5of6, 5of6b, 5of6c |
| 6 | Confirmation & print | Unique code (E-35058-001396), 14-day validity, view/print voucher, food bank contact | 6of6.png |

**Reason for Referral (Steps 3–4) detail:**

- Income source selection (e.g. Earning, Benefits, No income, Declined/Unable to answer)
- Financial circumstances: benefits, debts, costs (multiple categories; “up to 4 reasons”)
- Personal circumstances (e.g. housing, immigration, relationship, domestic abuse)
- Health information (with consent notice)
- “No answer” options: None applicable, Declined to answer, Unable to ask
- Notes field (max 400 chars); subject access request warning
- Privacy information / consent for personal and health/ethnicity data
- **>3 vouchers in 6 months:** extra section “Reason for needing more than 3 vouchers…” with predefined reasons + Notes; consent for statistical use

**Voucher information (Step 4):**

- Date voucher issued
- Referral agency information (auto-populated): agency name, contact phone (on printed voucher), email (not on voucher), person who issued
- Ethnic group (privacy-focused: not stored in client record; option to remove/re-enter)
- Household composition by age (adults 17–24, 25–34, … 75+, Not specified; children 0–4, 5–11, 12–16, Not specified)
- Contact consent (phone/email for food bank contact)
- Dietary requirements consent checkbox; “Does the person referred have any dietary requirements?” (Yes/No); additional parcel notes (on printed e-voucher)

**Food bank selection (Step 5):**

- Can client collect parcel? (Yes / No – delivery)
- Contact consent (phone/email)
- Nearest food bank centres (selection; map/directions later)
- Collection and delivery notes (with warning: do not record sensitive personal data)

**Confirmation (Step 6):**

- Unique voucher code format: `E-XXXXX-XXXXXX`
- 14-day validity
- View and print voucher
- Food bank contact (email, phone)

### 3.C Voucher Redemption Module (Back Office Access)

- Voucher search: by code, client name, or date
- Redemption: scan/enter code → show referral criteria, dietary requirements, notes
- Mark as fulfilled with date stamp
- Reason for redemption failure (if applicable)

### 3.D Reporting Module (Admin Access)

- Voucher analytics: issued vs redeemed, top referral reasons, demographics, agency performance, repeat usage
- Export: CSV, PDF
- Real-time dashboard: key metrics at a glance

---

## 4. Database Schema (Recommendations)

Schema will be implemented in **Prisma** (`prisma/schema.prisma`) with PostgreSQL. Planned entities:

| # | Entity | Purpose |
|---|--------|--------|
| 1 | **Users** | `role`: admin \| third_party \| back_office; link to agency for third_party |
| 2 | **Clients** | Personal details, address (or “no fixed address”), history |
| 3 | **Vouchers** | code, issue_date, expiry_date (issue + 14d), status, client_id, agency_id, referral_details_id, center_id, etc. |
| 4 | **ReferralDetails** | Reasons, notes (400 chars), consents, income source, ethnic group (if stored per referral only), household composition, dietary consent & requirements, >3 vouchers reason |
| 5 | **Agencies** | Third-party organisations (name, contact phone/email, etc.) |
| 6 | **FoodBankCenters** | Locations, hours, collection/delivery capability, contact info |
| 7 | **Redemptions** | date, center_id, staff_id (user_id), voucher_id, failure reason (optional) |
| 8 | **AuditLogs** | All material system actions for compliance |

Ethnic group: keep “privacy-focused” (e.g. only in ReferralDetails for reporting, not in Clients; support “remove association” and “re-enter”).

---

## 5. Features to Implement (from reference screenshots)

- **Duplicate client detection:** Show similar records + last voucher dates; discourage duplicate creation.
- **Consent management:** Explicit consent for health/ethnicity; privacy text; GDPR-oriented handling.
- **Validation rules:**
  - 3-voucher limit in 6 months → require justification (and optional extra reason step).
  - Required fields and postcode format validation.
- **Food bank centre selection:** By distance (geolocation later), collection/delivery capability, contact info.
- **Unique voucher code:** Format `E-XXXXX-XXXXXX`, 14-day validity.
- **Print-friendly views:** Voucher print layout; what appears on printed voucher vs internal only (e.g. agency phone on voucher, email not).

---

## 6. UI/UX Considerations

- Responsive design (including mobile for field use).
- Step-by-step wizard for voucher issuance with clear progress (e.g. “Step X of 6”).
- Breadcrumb navigation for wizard and main app.
- Print-friendly views for physical vouchers.
- Color coding for statuses (e.g. issued, redeemed, expired; red for “vouchers in last 6 months” when over threshold).
- Search filters for clients and vouchers (multiple criteria).

---

## 7. Security & Compliance

- **RBAC:** All routes and API actions gated by role (admin, third_party, back_office).
- **Data protection:** Encryption for sensitive client data at rest (and in transit via HTTPS).
- **Audit trail:** Log critical actions (voucher issue/redeem, client create/update, user changes, etc.).
- **Consent tracking:** Record consent for health/ethnicity and contact where required.
- **Session management:** Auto-logout after inactivity.
- **GDPR:** Support data deletion requests and data minimization; ethnic group handling as above.

---

## 8. Integration Points (Later)

- Email/SMS: voucher notifications.
- Mapping API: food bank locations and directions.
- Reporting/analytics tooling for admin.
- Print: browser print or PDF for physical vouchers.

---

## 9. Dashboard Layout (Mockup)

```
Dashboard Layout:
├── Top Navigation (role-based menu)
├── Left Sidebar (module access by role)
├── Main Content Area
│   ├── Search Bar (clients / vouchers as appropriate)
│   ├── Action Buttons (role-dependent)
│   └── Data Tables / Forms
└── Status Bar (user info, notifications)
```

**Key pages:**

1. Login (with role selection if applicable)
2. Admin Dashboard
3. Client Search / Create
4. Voucher Issuance Wizard (Steps 1–6)
5. Voucher Redemption
6. Reports Dashboard
7. User Management
8. System Settings

---

## 10. Implementation Priority

| Phase | Focus |
|-------|--------|
| **Phase 1** | Core voucher issuance and redemption (auth, RBAC, clients, vouchers, referral details, basic redemption). |
| **Phase 2** | Advanced reporting and analytics (admin reports, exports). |
| **Phase 3** | Mobile-friendly refinements / future mobile app integration. |
| **Phase 4** | External API for third-party integrations. |

---

## 11. Next Steps (Before Coding)

1. **Confirm stack:** Next.js version, Node version, package manager (npm/yarn/pnpm).
2. **Database:** Confirmed — PostgreSQL + Prisma, same approach as ordafy (§1.3.1). Implement schema from §4 in `prisma/schema.prisma`; add `lib/db` singleton.
3. **Choose auth:** NextAuth vs custom (login, session, role in session).
4. **Create repo:** Scaffold Next.js app in `my-food-bank` with structure in §1.2 and §1.3 (app routes, lib, prisma, scripts).
5. **Implement in order:** Phase 1 first (auth, RBAC, client search, voucher wizard, redemption), then Phase 2+.

---

## 12. Reference Assets

Screenshots and assets are stored under the project assets path and correspond to:

- **1OF6.png** — Step 1: Search for client (name, surname, postcode, no fixed address).
- **2of6.png** — Client search results; duplicate detection; “Issue voucher” / “Expand details”.
- **3of6.png** — Step 2: Client details verification; “Update client details”.
- **3of6a–3of6f** — Step 3/4: Reasons for referral, income source, notes, privacy, >3 vouchers reason.
- **4of6a–4of6d** — Voucher information, agency details, ethnic group, household, dietary/parcel notes.
- **5of6, 5of6b, 5of6c** — Step 5: Food bank centres, collection/delivery, contact consent, collection notes.
- **5of6c** — Collection and delivery notes (sensitive data warning).
- **6of6.png** — Step 6: Confirmation, unique code, view/print voucher, food bank contact.

Use these as the source of truth for form fields, labels, and step order when implementing the wizard and related APIs.

---

*End of project plan. Do not create the Next.js project or write application code until this plan is agreed and next steps (§11) are confirmed.*

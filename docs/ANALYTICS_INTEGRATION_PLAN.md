# Organization Analytics — Integration Plan

This document defines how to add a **professional, modern analytics experience** for tenant organizations in SupportHubs, scoped by **RBAC** and **multi-tenant** boundaries. It builds on the existing reports API (`GET /api/reports`) and permission model (`REPORTS_READ`).

**Project directory:** `applications/supportshub-platform` (package name: `supporthubs`).

---

## 1. Goals

| Goal | Description |
|------|-------------|
| **Organization analytics** | Each tenant sees only their own data (`organizationId` from session/tenant context). |
| **RBAC** | Access gated by permissions; no cross-org leakage. |
| **Time ranges** | Presets: **Daily**, **Weekly**, **Monthly**, **60 days**, **Yearly**, **All time** (plus optional custom range later). |
| **Required KPIs** | **Total users** (all roles in the org), **Clients served** (derived from redeemed vouchers). |
| **Professional UI** | Dedicated analytics page with KPI cards, charts, tables, and clear period switching. |
| **Dashboard overview** | Small analytics summary cards on the main dashboard + CTA to full analytics page. |

---

## 2. Current state (baseline)

### 2.1 RBAC

| Role | `REPORTS_READ` | Notes |
|------|----------------|--------|
| `admin` | Yes | Full tenant permissions. |
| `third_party` | No | Issue/view own vouchers only. |
| `back_office` | No | Redeem + view vouchers. |
| `super_admin` | No (platform) | Platform-only permissions; not org analytics. |

**Recommendation:** Keep analytics behind **`Permission.REPORTS_READ`** (admin-only today). Optionally add `REPORTS_READ` to `back_office` in a later phase if fulfilment staff need read-only analytics.

### 2.2 Existing assets

- **API:** `GET /api/reports` — date range via `fromDate` / `toDate`; returns issued/redeemed/expired counts, by agency, by center, top income sources. Scoped to `tenant.organizationId`.
- **UI:** `/dashboard/reports` — date pickers, summary cards, tables, CSV export.
- **Types:** `ReportData`, `ReportParams` in `lib/types/index.ts`.
- **Client:** `api.reports.get()`, `api.reports.getCsvUrl()` in `lib/api/client.ts`.
- **Navigation:** Sidebar “Reports” with `REPORTS_READ`; dashboard quick action “Reports”.

### 2.3 Gaps vs requirements

| Requirement | Gap |
|-------------|-----|
| Preset periods (daily, weekly, …) | Reports only support manual from/to dates. |
| Total users (all types) | Not in reports API. |
| Clients served (redeemed) | Reports count **vouchers** redeemed, not **unique clients** served. |
| Modern analytics UI | Reports page is table-heavy; no charts or period tabs. |
| Dashboard overview | Dashboard has no KPI cards. |
| Dedicated “Analytics” | Branding/navigation still “Reports”. |

---

## 3. Product design

### 3.1 Information architecture

```
Dashboard (/dashboard)
  └── Analytics overview (cards) — REPORTS_READ only
        └── "View full analytics" → /dashboard/analytics

Analytics (/dashboard/analytics) — primary experience
  └── Period: Daily | Weekly | Monthly | 60 days | Yearly | All time
  └── KPI row
  └── Charts + breakdown tables
  └── Export (CSV) — reuse or extend reports API

Reports (/dashboard/reports) — optional
  └── Keep for CSV / legacy, or redirect to Analytics with ?tab=export
```

**Recommended:** Introduce **`/dashboard/analytics`** as the main page. Keep **`/dashboard/reports`** temporarily with a banner linking to Analytics, then deprecate or merge export into Analytics in Phase 4.

### 3.2 Period presets (server-side)

Define a single query param `period` (enum). Server computes `fromDate` / `toDate` in **UTC** (consistent with existing reports route).

| Preset | `period` value | Range (inclusive end = end of today UTC) |
|--------|----------------|------------------------------------------|
| Daily | `daily` | Start of today → end of today |
| Weekly | `weekly` | Start of current calendar week (Mon) → end of today |
| Monthly | `monthly` | Start of current calendar month → end of today |
| 60 days | `60d` | Today − 59 days → end of today |
| Yearly | `yearly` | Start of current calendar year → end of today |
| All time | `all` | Org `createdAt` (or first voucher) → end of today |

Also return `fromDate` / `toDate` as ISO date strings in the response so the UI can display the active range.

Optional Phase 2: `period=custom` with `fromDate` & `toDate` (already supported by reports).

### 3.3 Metrics dictionary

#### Primary KPIs (hero row)

| Metric | Definition | Source |
|--------|------------|--------|
| **Total users** | Count of `User` where `organizationId = tenant` and `status = ACTIVE` (optional: include SUSPENDED in “all users” sub-label). Breakdown by `role`: admin, third_party, back_office. | `User` |
| **Clients served** | **Distinct `clientId`** among vouchers that have at least one `Redemption` with `redeemedAt` in range. | `Voucher` + `Redemption` |
| **Vouchers redeemed** | Count of redemptions in range (activity volume). | `Redemption` |
| **Vouchers issued** | Count of vouchers with `issueDate` in range. | `Voucher` |
| **Redemption rate** | `redeemed in period / issued in period` (cap display at 100% or show “—” if issued = 0). | Derived |

**Clarification for “clients served”:** Use **unique clients** with a redemption in the period, not redemption row count. Show both “Clients served” and “Redemptions” so users understand volume vs reach.

#### Secondary metrics (cards / charts)

| Metric | Notes |
|--------|--------|
| Expired / unfulfilled vouchers | By `status` in period (issue date or status change — align with reports: issue date in range). |
| Users by role | Pie or stacked bar: admin / third_party / back_office. |
| Vouchers over time | Time series: issued vs redeemed per day/week bucket depending on period. |
| By agency | Issued vs redeemed (extend existing `byAgency`). |
| By food bank centre | Redemptions (extend existing `byCenter`). |
| Top income sources | From referral details (existing). |
| Active agencies / centres | Count with activity in period. |

### 3.4 RBAC & data scoping rules

1. Every analytics query **must** filter by `tenant.organizationId` from `getSessionUserAndTenant`.
2. Handler **must** require `REPORTS_READ` (same as reports).
3. UI routes wrapped with `useRbac()` / server guard; hide sidebar, dashboard cards, and API when forbidden.
4. **No** platform (`super_admin`) org analytics on tenant subdomain unless impersonation is added later.
5. Agency-scoped roles: if `back_office` gains read access later, consider filtering “by agency” to `user.agencyId` only — out of scope for v1 (admin sees all org data).

---

## 4. Technical architecture

### 4.1 API

**New:** `GET /api/analytics`

**Query parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `period` | enum | Yes* | `daily` \| `weekly` \| `monthly` \| `60d` \| `yearly` \| `all` |
| `fromDate` | ISO date | No | Used when `period` omitted (backward compat) or `custom` |
| `toDate` | ISO date | No | Same |
| `format` | `json` \| `csv` | No | Default `json` |

\*Prefer required `period` on the new analytics page; reports can keep from/to only.

**Response shape (JSON):**

```ts
interface AnalyticsPeriod {
  period: "daily" | "weekly" | "monthly" | "60d" | "yearly" | "all";
  fromDate: string;
  toDate: string;
  label: string; // e.g. "Last 60 days"
}

interface AnalyticsUsers {
  total: number;
  active: number;
  byRole: { admin: number; third_party: number; back_office: number };
}

interface AnalyticsClientsServed {
  uniqueClients: number;
  redemptions: number;
}

interface AnalyticsVouchers {
  issued: number;
  redeemed: number;
  expired: number;
  unfulfilled: number;
}

interface AnalyticsTimeSeriesPoint {
  date: string; // bucket start ISO date
  issued: number;
  redeemed: number;
}

interface AnalyticsData {
  period: AnalyticsPeriod;
  users: AnalyticsUsers;
  clientsServed: AnalyticsClientsServed;
  vouchers: AnalyticsVouchers;
  timeSeries: AnalyticsTimeSeriesPoint[];
  byAgency: ReportAgencyRow[];
  byCenter: ReportCenterRow[];
  topIncomeSources: ReportIncomeSourceRow[];
}
```

**Implementation notes:**

- Add `lib/analytics/period.ts` — `resolvePeriod(period: string, orgCreatedAt?: Date): { from, to, label }`.
- Add `lib/analytics/queries.ts` — Prisma aggregations (prefer `groupBy` / raw counts over loading full tables for large orgs).
- **Clients served:**  
  `db.redemption.findMany({ where: { redeemedAt, voucher: { organizationId } }, select: { voucher: { select: { clientId: true } } } })` then unique clientIds, or use `distinct` via query:
  ```ts
  const redemptions = await db.redemption.findMany({ ... });
  const uniqueClients = new Set(redemptions.map(r => r.voucher.clientId)).size;
  ```
- **Users:** `db.user.groupBy({ by: ['role'], where: { organizationId, status: 'ACTIVE' }, _count: true })`.
- **Time series:** Bucket by day for daily/weekly/monthly/60d; by week for yearly; by month for all-time if range > 90 days.

**Performance:** Add indexes if needed (existing: `vouchers.organizationId`, `redemptions.redeemedAt`). Consider caching overview endpoint for dashboard (Phase 3).

**Optional:** `GET /api/analytics/overview` — lightweight payload for dashboard cards only (same period default: `monthly` or `30d`).

### 4.2 Frontend

| Path | Purpose |
|------|---------|
| `app/(dashboard)/dashboard/analytics/page.tsx` | Main analytics page |
| `app/(dashboard)/dashboard/analytics/layout.tsx` | Metadata, optional guard |
| `components/analytics/period-selector.tsx` | Tab/pill UI for presets |
| `components/analytics/kpi-card.tsx` | Reusable stat card with trend placeholder |
| `components/analytics/voucher-trend-chart.tsx` | Line/area chart (recharts) |
| `components/analytics/users-by-role-chart.tsx` | Donut/bar chart |
| `components/dashboard/analytics-overview.tsx` | Dashboard strip |

**Dependencies:** Add `recharts` (and optionally shadcn `chart` wrapper if you adopt ui.shadcn chart component). Use existing `Card`, `Button`, `Loading`, Tailwind tokens.

### 4.3 Types & API client

- `lib/types/index.ts` — add `AnalyticsData`, `AnalyticsPeriod`, enums.
- `lib/api/client.ts` — `api.analytics.get({ period })`, `api.analytics.overview.get()`.

### 4.4 Navigation & dashboard

**Sidebar** (`components/layout/sidebar.tsx`):

- Add **Analytics** → `/dashboard/analytics`, permission `REPORTS_READ`, icon `LineChart` or `BarChart3`.
- Keep **Reports** or rename to “Export” under Analytics submenu (Phase 4).

**Dashboard** (`app/(dashboard)/dashboard/page.tsx`):

- Above or below “Quick actions”, add **Analytics overview** section (only if `REPORTS_READ`):
  - 3–4 compact KPI cards: Users, Clients served (MTD or monthly preset), Vouchers issued, Vouchers redeemed.
  - Button: **View full analytics** → `/dashboard/analytics`.

---

## 5. UI/UX specification (modern & professional)

### 5.1 Visual language

- **Layout:** Max-width container, generous whitespace, responsive grid.
- **KPI cards:** Large number, short label, muted subtext (period + comparison placeholder for v2).
- **Period selector:** Horizontal pills (mobile: scrollable); active state uses `primary` background; show computed date range under title.
- **Charts:** Muted grid, brand primary for “redeemed”, secondary for “issued”; accessible contrast.
- **Tables:** Same `Table` component as reports; sort by volume default.
- **Empty states:** Friendly copy when no data in period.
- **Loading:** Skeleton cards + chart placeholder (avoid layout shift).

### 5.2 Analytics page wireframe (desktop)

```
┌─────────────────────────────────────────────────────────────┐
│ Analytics                                    [Export CSV]   │
│ Organization performance · Mon 1 Jan – Sun 7 Jan 2026       │
├─────────────────────────────────────────────────────────────┤
│ [Daily][Weekly][Monthly][60 days][Yearly][All time]         │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│ Users    │ Clients  │ Issued   │ Redeemed │ Redemption rate │
│ 24       │ served  │ 142      │ 118      │ 83%             │
│ 3 roles  │ 115      │          │          │                 │
├─────────────────────────────────────────────────────────────┤
│ Voucher activity (chart)          │ Users by role (donut)   │
├─────────────────────────────────────────────────────────────┤
│ By agency (table)                 │ By centre (table)       │
├─────────────────────────────────────────────────────────────┤
│ Top income sources (table)                                  │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Dashboard overview wireframe

```
┌─────────────────────────────────────────────────────────────┐
│ Overview · Last 30 days              [View full analytics →]│
├──────────┬──────────┬──────────┬──────────┤
│ Users    │ Clients  │ Issued   │ Redeemed │
│ 24       │ served   │ 142      │ 118      │
│          │ 115      │          │          │
└──────────┴──────────┴──────────┴──────────┘
```

### 5.4 Accessibility

- Period pills: `role="tablist"` / `aria-selected`.
- Charts: supplementary table or `aria-label` with summary values.
- Keyboard navigation for period switcher.

---

## 6. Implementation phases

| Phase | Scope | Deliverables |
|-------|--------|--------------|
| **1** | API foundation | `period` resolver, `GET /api/analytics`, types, client method, unit-tested date logic |
| **2** | Analytics page | Period selector, KPIs, tables, basic charts, RBAC guard |
| **3** | Dashboard overview | Overview API or query param, dashboard cards + CTA, sidebar link |
| **4** | Polish & reports merge | CSV from analytics, skeletons, empty states, redirect/link from Reports |
| **5** (optional) | RBAC expansion | `REPORTS_READ` for back_office; agency-scoped analytics |

---

## 7. Files to create or modify

### Create

- `docs/ANALYTICS_INTEGRATION_PLAN.md` (this file)
- `docs/ANALYTICS_IMPLEMENTATION_COMMANDS.md`
- `lib/analytics/period.ts`
- `lib/analytics/queries.ts`
- `app/api/analytics/route.ts`
- `app/api/analytics/overview/route.ts` (optional)
- `app/(dashboard)/dashboard/analytics/page.tsx`
- `app/(dashboard)/dashboard/analytics/layout.tsx`
- `components/analytics/period-selector.tsx`
- `components/analytics/kpi-card.tsx`
- `components/analytics/voucher-trend-chart.tsx`
- `components/analytics/users-by-role-chart.tsx`
- `components/dashboard/analytics-overview.tsx`

### Modify

- `lib/types/index.ts` — analytics types
- `lib/api/client.ts` — `api.analytics`
- `components/layout/sidebar.tsx` — Analytics nav item
- `app/(dashboard)/dashboard/page.tsx` — overview section
- `app/(dashboard)/dashboard/reports/page.tsx` — link to analytics (Phase 4)
- `package.json` — `recharts` dependency (Phase 2)

### No schema migration required

All metrics derivable from existing `User`, `Voucher`, `Redemption`, `Agency`, `FoodBankCenter`, `ReferralDetails`.

---

## 8. Testing & acceptance criteria

### 8.1 API

- [ ] Non-admin without `REPORTS_READ` receives 403.
- [ ] Tenant A cannot see Tenant B metrics.
- [ ] Each `period` returns correct `fromDate`/`toDate`.
- [ ] `clientsServed.uniqueClients` ≤ distinct clients with redemption in range.
- [ ] `users.total` matches DB count for org.

### 8.2 UI

- [ ] Period switch refetches data without full page reload.
- [ ] Dashboard cards visible only with `REPORTS_READ`.
- [ ] “View full analytics” navigates to `/dashboard/analytics` with same or default period.
- [ ] Mobile: KPI grid stacks 2×2; period pills scroll horizontally.
- [ ] `pnpm run type-check`, `lint`, `build` pass.

### 8.3 Manual QA scenarios

1. Org with 0 redemptions in period → Clients served = 0, empty chart message.
2. Org with multiple redemptions same client → Clients served counts client once.
3. Switch Daily → Yearly → All time → numbers change consistently.

---

## 9. Security & privacy

- Do not expose PII in analytics API (aggregates only; no client names in overview).
- CSV export: same permission and scope as JSON.
- Rate-limit analytics endpoint in production if needed (future).

---

## 10. Future enhancements (out of scope v1)

- Period-over-period comparison (% change vs previous period).
- Fulfilment weight aggregates (avg kg redeemed).
- Scheduled email reports.
- Platform-wide analytics for super_admin across all orgs.
- Custom date range picker on analytics page.
- Caching / materialized views for very large tenants.

---

## 11. Related documents

- `docs/ANALYTICS_IMPLEMENTATION_COMMANDS.md` — copy-paste prompts per phase.
- `docs/IMPLEMENTATION_COMMANDS.md` — general multi-tenant commands.
- `app/api/reports/route.ts` — existing report aggregation reference.

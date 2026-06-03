# Analytics Implementation Commands

Use these commands **one at a time** in Cursor. Copy-paste each block into the chat so the agent implements that step only. After each phase (or when the agent finishes a step), run from the project root:

```bash
pnpm run type-check && pnpm run lint && pnpm run build
```

**Project directory:** `applications/supportshub-platform`  
**Reference plan:** `docs/ANALYTICS_INTEGRATION_PLAN.md`

---

## Pre-flight (run once before Phase 1)

```
We are implementing organization analytics for SupportHubs in applications/supportshub-platform. Read docs/ANALYTICS_INTEGRATION_PLAN.md first. All work must scope data by tenant organizationId from getSessionUserAndTenant and require Permission.REPORTS_READ (same as /api/reports). Do not add Prisma migrations unless the plan explicitly requires them. Before coding, run pnpm run type-check, pnpm run lint, and pnpm run build and note any existing failures.
```

---

## Phase 1 — API foundation

### 1.1 — Period resolver utility

```
In applications/supportshub-platform, add lib/analytics/period.ts that exports resolveAnalyticsPeriod(period: string, options?: { orgCreatedAt?: Date }): { period, fromDate: Date, toDate: Date, fromDateStr: string, toDateStr: string, label: string }. Support period values: daily, weekly, monthly, 60d, yearly, all. Use UTC day boundaries consistent with app/api/reports/route.ts. For "all", use orgCreatedAt if provided else a sensible fallback (e.g. 10 years ago). Validate unknown period and throw or return 400-friendly error. Add minimal unit tests or inline JSDoc examples for each preset.
```

### 1.2 — Analytics aggregation queries

```
In applications/supportshub-platform, add lib/analytics/queries.ts with a function getOrganizationAnalytics(organizationId: string, fromDate: Date, toDate: Date) that returns: users (total active, byRole: admin/third_party/back_office counts), clientsServed (uniqueClients with at least one redemption in range, redemptions count), vouchers (issued/redeemed/expired/unfulfilled counts for vouchers with issueDate in range — align redeemed count with redemptions in range for activity), timeSeries (daily buckets of issued vs redeemed counts), byAgency, byCenter, topIncomeSources (reuse logic from app/api/reports/route.ts). Use efficient Prisma queries; avoid loading full voucher lists when count/groupBy suffices.
```

### 1.3 — GET /api/analytics route

```
In applications/supportshub-platform, add app/api/analytics/route.ts: GET handler using getSessionUserAndTenant and REPORTS_READ. Query param period (required for this route) or optional fromDate/toDate for custom range. Call resolveAnalyticsPeriod and getOrganizationAnalytics. Return JSON matching AnalyticsData shape in lib/types/index.ts (add types in this step). Support format=csv by delegating to same row structure as reports CSV or a simplified analytics CSV. Return 400 for invalid period or date range.
```

### 1.4 — Types and API client

```
In applications/supportshub-platform, add AnalyticsData and related interfaces to lib/types/index.ts per docs/ANALYTICS_INTEGRATION_PLAN.md section 4.1. Add api.analytics.get({ period?, fromDate?, toDate? }) and optional api.analytics.getCsvUrl in lib/api/client.ts. Run type-check and fix any errors.
```

---

## Phase 2 — Analytics page (main UI)

### 2.1 — Install chart library

```
In applications/supportshub-platform, add recharts as a dependency (pnpm add recharts). Ensure it works with React 19 / Next 15. Do not break the build.
```

### 2.2 — Shared analytics components

```
In applications/supportshub-platform, create components/analytics/kpi-card.tsx (title, value, subtitle, optional icon), components/analytics/period-selector.tsx (pills for daily, weekly, monthly, 60d, yearly, all — controlled component with onPeriodChange), and placeholder skeleton variants. Match existing Card/Button/Tailwind design tokens for a modern professional look.
```

### 2.3 — Chart components

```
In applications/supportshub-platform, create components/analytics/voucher-trend-chart.tsx (line or area chart: issued vs redeemed from timeSeries) and components/analytics/users-by-role-chart.tsx (donut or bar chart from users.byRole). Use recharts with responsive container. Accessible colors using CSS variables / primary tokens.
```

### 2.4 — Analytics page route

```
In applications/supportshub-platform, add app/(dashboard)/dashboard/analytics/page.tsx and layout.tsx. Client page: useRbac REPORTS_READ guard, period selector, fetch api.analytics.get on period change, show KPI row (total users with role breakdown subtext, clients served uniqueClients, vouchers issued, vouchers redeemed, redemption rate), voucher trend chart, users by role chart, tables for byAgency, byCenter, topIncomeSources. Show active period date range under the title. Loading and error states. Export CSV button using api.analytics.getCsvUrl if implemented. Professional spacing and responsive grid per ANALYTICS_INTEGRATION_PLAN.md wireframe.
```

---

## Phase 3 — Dashboard overview & navigation

### 3.1 — Analytics overview API (optional lightweight)

```
In applications/supportshub-platform, add GET app/api/analytics/overview/route.ts OR extend GET /api/analytics with query overview=true that returns only: users.total, clientsServed.uniqueClients, vouchers.issued, vouchers.redeemed, period label, fromDate, toDate — default period monthly. Same RBAC and tenant scope. Wire api.analytics.overview.get() in client if separate route.
```

### 3.2 — Dashboard analytics cards

```
In applications/supportshub-platform, create components/dashboard/analytics-overview.tsx that fetches overview analytics (default period monthly or 60d), displays 4 compact KPI cards (Users, Clients served, Vouchers issued, Vouchers redeemed), and a primary button "View full analytics" linking to /dashboard/analytics. Use useRbac — render nothing if !REPORTS_READ.
```

### 3.3 — Integrate dashboard and sidebar

```
In applications/supportshub-platform, update app/(dashboard)/dashboard/page.tsx to render AnalyticsOverview above Quick actions when user has REPORTS_READ. Update components/layout/sidebar.tsx to add nav item Analytics → /dashboard/analytics with BarChart3 or LineChart icon and REPORTS_READ permission. Keep Reports nav item for now. Run type-check, lint, build.
```

---

## Phase 4 — Polish & reports alignment

### 4.1 — Reports page cross-link

```
In applications/supportshub-platform, update app/(dashboard)/dashboard/reports/page.tsx: add prominent link/card at top "View modern analytics" → /dashboard/analytics. Optionally default analytics period when arriving from dashboard query ?period=monthly.
```

### 4.2 — Empty states and skeletons

```
In applications/supportshub-platform, improve analytics page UX: skeleton loaders for KPIs and charts while loading; empty state when all counts are zero; format numbers with locale (e.g. en-GB). Ensure period selector updates URL searchParams ?period= for shareable links (optional but preferred).
```

### 4.3 — Final validation

```
In applications/supportshub-platform, run pnpm run type-check, pnpm run lint, pnpm run build. Fix all errors. Manually verify: admin sees analytics; third_party and back_office do not (unless REPORTS_READ was granted). Confirm clients served uses unique clientIds from redemptions in period. Summarize files changed.
```

---

## Phase 5 (optional) — Extend RBAC for back office

### 5.1 — Grant reports to back_office

```
In applications/supportshub-platform, add Permission.REPORTS_READ to BACK_OFFICE_PERMISSIONS in lib/rbac/permissions.ts if product owner wants fulfilment staff to view analytics. Update any docs/comments. Run type-check and build. Do not change third_party unless requested.
```

---

## Quick reference — metric definitions (for agent)

Copy this if the agent needs clarity on **clients served**:

```
"Clients served" = count of distinct clientId on vouchers that have at least one Redemption with redeemedAt between fromDate and toDate (inclusive), scoped to organizationId. "Vouchers redeemed" = count of Redemption rows in that same window. "Total users" = count of User where organizationId matches tenant and status is ACTIVE; also return breakdown by role admin, third_party, back_office.
```

---

## Suggested order summary

| Step | Command block |
|------|----------------|
| 0 | Pre-flight |
| 1 | 1.1 → 1.2 → 1.3 → 1.4 |
| 2 | 2.1 → 2.2 → 2.3 → 2.4 |
| 3 | 3.1 → 3.2 → 3.3 |
| 4 | 4.1 → 4.2 → 4.3 |
| 5 | 5.1 (optional) |

---

## One-shot command (use only if you want everything in one session)

```
Implement the full organization analytics feature per docs/ANALYTICS_INTEGRATION_PLAN.md: API with period presets (daily, weekly, monthly, 60d, yearly, all), metrics including total users by role and clients served (unique clients with redemption in period), analytics page with modern UI and recharts, dashboard overview cards with link to /dashboard/analytics, sidebar nav, REPORTS_READ RBAC, tenant scoping. Follow phases 1–4 in order. Run type-check, lint, and build at the end.
```

Prefer **step-by-step commands above** for reviewable PRs and easier debugging.

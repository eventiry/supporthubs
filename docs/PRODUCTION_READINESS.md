# Production Readiness

This document summarises what is in place for production and industry-standard operation of **Support Hubs**, and what you may want to add for your deployment.

## In place

### Security

- **Session auth:** HttpOnly cookie, session data in database; secure cookie in production, SameSite=Lax.
- **Headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`; `X-Powered-By` removed.
- **Auth flows:** Forgot-password does not reveal whether an email exists (no user enumeration). Reset and invite tokens are time-limited and single-use where applicable.

### Reliability and UX

- **Health check:** `GET /api/health` returns `{ ok: true, database: "connected"|"disconnected" }` for load balancers and monitoring.
- **Error handling:** Root `error.tsx` shows a friendly message and “Try again” / “Go home”. Root `not-found.tsx` for 404s.
- **API errors:** Structured `ApiError` and variants (e.g. `UnauthorizedError`, `ValidationError`) for consistent client handling.

### Legal and compliance

- **Legal pages:** `/legal/privacy`, `/legal/terms`, `/legal/cookies` with structured, placeholder content. Replace with your final legal text and dates.
- **Footer:** Public footer links to Privacy, Terms, and Cookies so the site is linkable and compliant with common expectations.

### SEO and metadata

- **Metadata:** Root layout sets `metadataBase`, title template, description, `applicationName`, `openGraph`, `twitter`, and `robots: { index, follow }`.
- **Sitemap:** `app/sitemap.ts` exposes public routes (home, pricing, benefits, about, contact, legal). Uses `NEXT_PUBLIC_APP_URL` for base URL.
- **Robots:** `app/robots.ts` allows crawlers, disallows `/dashboard/`, `/login`, `/join`, `/api/`, and references the sitemap.

### Email

- **Config:** Central `lib/email/config.ts` for app name, logo URL, support email, company URLs, brand colour (env-driven).
- **Templates:** Header (logo/text), industry-style footer, layout; invitation, password-reset, contact-submission templates.
- **Sending:** Resend with SMTP fallback; default `replyTo` from config; `.env.example` documents email variables.

### Database and deployment

- **Prisma:** Migrations and seed; production deploy uses `db:migrate:deploy`.
- **Checklist:** `CHECKLIST.md` covers type-check, lint, build, env vars, DB, auth, and optional hardening.

---

## Recommended next steps (by environment)

### Before first production deploy

1. **Env:** Set all required variables (see `.env.example` and `CHECKLIST.md`). At minimum: `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, and email/Resend if you use password reset or invitations.
2. **Legal:** Replace placeholder text and “Last updated” dates on `/legal/privacy`, `/legal/terms`, and `/legal/cookies` with your final versions and have them reviewed as needed.
3. **Branding:** Set `EMAIL_LOGO_URL` and any tenant branding (e.g. tenant logo/colours) so emails and UI match your organisation.

### Hardening (industry standard)

| Area | Suggestion |
|------|------------|
| **Rate limiting** | Add rate limits for login (`/api/auth/login`) and contact (`/api/contact`) to reduce brute-force and spam. Use in-memory store per instance or a shared store (e.g. Redis/Upstash) in multi-instance deployments. |
| **Env validation** | Optionally validate required env (e.g. `DATABASE_URL`) at startup or in a dedicated health/readiness route so misconfiguration fails fast with a clear error. |
| **CSP** | Consider a Content-Security-Policy header once you know all script/style sources; start with report-only if needed. |
| **Logging** | In production, avoid logging sensitive data; consider structured logging and a log aggregation service. |
| **Monitoring** | Use `/api/health` in your orchestrator; add alerting on errors and latency for critical paths. |

### Optional

- **Cookie/consent banner:** A `ConsentBanner` component exists; wire it into the public layout if you need explicit consent (e.g. for non-essential cookies or marketing). Ensure it points to your `/legal/*` URLs.
- **Backups:** Automated DB backups and a tested restore procedure.
- **CI/CD:** Run `type-check`, `lint`, and `build` (and optionally tests) on every commit or PR.

---

## Quick verification

```bash
pnpm run type-check
pnpm run lint
pnpm run build
```

After deploy: open `/api/health`, `/legal/privacy`, `/sitemap.xml`, and `/robots.txt` to confirm they behave as expected.

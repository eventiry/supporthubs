# Production deployment

## Production readiness verification

Before release, ensure:

1. **Type check** — `pnpm run type-check` (no TypeScript errors).
2. **Lint** — `pnpm run lint` (no ESLint errors; warnings are acceptable).
3. **Build** — `pnpm run build` (production build succeeds).
4. **Environment** — All required and desired env vars set (see below). Never commit real secrets; use `.env.example` with placeholders only.
5. **Database** — Migrations applied; seed if needed.
6. **HTTPS** — Served over HTTPS in production; session cookie is secure when `NODE_ENV=production`.

If `pnpm run build` fails with `EPERM` on `.next`, delete the `.next` folder and retry (e.g. `rm -rf .next` or `Remove-Item -Recurse -Force .next` on Windows).

## Pre-deploy checks

Run the full validation before deploying:

```bash
pnpm run validate
```

This runs, in order:

- **Type check** (`pnpm run type-check`) — TypeScript with no emit
- **Lint** (`pnpm run lint`) — ESLint for `app`, `lib`, and `components`
- **Build** (`pnpm run build`) — Next.js production build

All three must pass with no errors. Fix any type, lint, or build errors before deploying.

## Environment

1. Copy `.env.example` to `.env` (or set env vars in your host).
2. **Required:**
   - `DATABASE_URL` — PostgreSQL connection string
   - `NEXTAUTH_SECRET` (or your session secret) — for production auth
3. **Recommended for production:**
   - `NEXT_PUBLIC_APP_URL` — public app URL (password reset links, emails)
   - `RESEND_API_KEY` — from [Resend](https://resend.com/api-keys); required for emails to be sent
   - `RESEND_FROM_EMAIL` — verified sender (e.g. `Support Hubs <noreply@yourdomain.com>` or `onboarding@resend.dev` for testing)
   - `CONTACT_EMAIL` — where contact form submissions are sent (and enquirer gets a confirmation email)
4. **Optional:** See `.env.example` for email branding, SMTP fallback, Stripe (subscriptions), S3 (logos), etc.

Optional env validation (fail fast if required vars missing): set `VALIDATE_ENV=true` or ensure `NODE_ENV=production` and use `validateEnv()` from `lib/env.ts` in your startup path if desired.

## Database

Before first deploy:

```bash
pnpm run db:generate
pnpm run db:migrate:deploy
```

Optional seed (default users/plans):

```bash
pnpm run db:seed
```

## Run production build

```bash
pnpm run build
pnpm run start
```

Or use your host’s Node start command (e.g. `node .next/standalone/server.js` if using `output: 'standalone'`).

## Security (included in build)

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Powered-By` header disabled

Configure HTTPS and any extra headers (CSP, HSTS) at the reverse proxy or platform.

## Health check

- `GET /api/health` — returns `{ ok: true, database: "connected"|"disconnected" }`. Use for load balancer or container readiness.

## Post-deploy checklist

- [ ] HTTPS enabled at reverse proxy / host
- [ ] `NEXT_PUBLIC_APP_URL` points to production URL
- [ ] Emails: Resend (or SMTP) configured; contact form and password reset tested
- [ ] Subscriptions (if used): `SUBSCRIPTION_ENABLED=true`, Stripe webhook URL and secret set, plans have `stripePriceId` or use auto-created Stripe prices
- [ ] Session cookie: secure in production (handled when `NODE_ENV=production`)
- [ ] Multi-tenant: `APP_DOMAIN` set to your main domain (e.g. `supporthubs.org`) for production subdomains
- [ ] Stripe (if used): webhook endpoint URL and `STRIPE_WEBHOOK_SECRET` set in Dashboard; `STRIPE_SECRET_KEY` in env

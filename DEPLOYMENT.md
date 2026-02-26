# Production Deployment Checklist

Use this checklist to deploy Support Hubs to production.

## Pre-deploy verification

Run locally before deploying:

```bash
pnpm run validate
```

This runs, in order: **type-check** → **lint** → **production build**. All must pass.

- **TypeScript**: `pnpm run type-check` (no type errors)
- **ESLint**: `pnpm run lint` (no lint errors; warnings are allowed)
- **Build**: `pnpm run build` (Next.js production build)

## Required environment variables

These are validated at server startup in production (see `lib/env.ts`). If any are missing, the server will not start.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. Neon, Supabase, RDS) |

## Recommended environment variables

Missing recommended vars produce a startup warning but do not block the server. Set these for full functionality:

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_SECRET` | Secret for session signing (use a long random string) |
| `NEXT_PUBLIC_APP_URL` | Public app URL (e.g. `https://app.supporthubs.org`) |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `RESEND_FROM_EMAIL` | Verified sender address for Resend |
| `CONTACT_EMAIL` | Support/contact email (used in footer and forms) |

## Optional / feature-specific

- **Email**: `EMAIL_APP_NAME`, `EMAIL_LOGO_URL`, `EMAIL_COMPANY_NAME`, `EMAIL_COMPANY_URL`, `EMAIL_PRIVACY_URL`, `EMAIL_SUPPORT_EMAIL`, `EMAIL_BRAND_COLOR` — see `lib/email/config.ts`
- **Multi-tenant**: `APP_DOMAIN`, `NEXT_PUBLIC_APP_DOMAIN` for subdomain routing
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, etc.
- **AWS S3**: For uploads (e.g. logos, avatars)

## Database

1. Run migrations: `pnpm run db:migrate:deploy`
2. (Optional) Seed: `pnpm run db:seed` — only if you use seed data

## Security (already configured)

- **next.config.ts**: `poweredByHeader: false`; security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) are set.
- **Instrumentation**: `instrumentation.ts` runs env validation on Node.js server startup.

## Post-deploy

1. Smoke-test: log in, load dashboard, trigger a password reset (or invitation) and confirm email is sent if Resend is configured.
2. Monitor logs for `[Env validation]` warnings about missing recommended vars.

# Production deployment checklist

Use this checklist before deploying Support Hubs to production.

## Pre-deploy verification (all must pass)

Run these locally before deploying. All must complete with **no errors**:

| Check | Command | Expected |
|-------|---------|----------|
| Type-check | `npm run type-check` | Exit 0, no type errors |
| Lint | `npm run lint` | Exit 0, no ESLint warnings or errors |
| Build | `npm run build` | Exit 0, "Compiled successfully", static pages generated |

If `npm run build` fails with a permission error on `.next/trace` (e.g. EPERM on Windows), delete the `.next` folder and run `npm run build` again.

## Required environment variables

Set these in your hosting environment (e.g. Vercel, Railway, or your server `.env`):

| Variable | Description |
|----------|--------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://user:password@host:5432/my_food_bank`) |
| Session / auth secret | For production, configure a session or auth secret if your auth layer requires it (e.g. `NEXTAUTH_SECRET` or `SESSION_SECRET`). See `.env.example`. |

Optional:

| Variable | Description |
|----------|--------------|
| `NEXT_PUBLIC_APP_URL` | Public app URL; used for API client when making server-side requests (e.g. `https://your-app.example.com`) |

Copy from `.env.example` and fill in real values; never commit `.env` with secrets.

## Pre-deploy checks

- [ ] **Type-check:** `npm run type-check` — no type errors.
- [ ] **Lint:** `npm run lint` — no lint errors (project lints `app` and `lib` only).
- [ ] **Build:** `npm run build` — completes successfully.
- [ ] **Runtime:** After deploy, smoke-test login, dashboard, and key flows; confirm no console or server errors.
- [ ] **Syntax / imports:** Build step will fail on invalid syntax or missing modules; fix any build errors before deploying.

## Database

- [ ] **Migrations:** Run `npm run db:migrate:deploy` against the production database before or during first deploy.
- [ ] **Seed (first deploy only):** If you need initial data (e.g. admin user, agencies), run `npm run db:seed` once after migrations. Ensure seed is idempotent or run only on empty DB.

## Auth and password reset

- **Login:** `/login` — email + password; “Forgot password?” links to `/forgot-password`.
- **Forgot password:** `/forgot-password` — request reset link; response does not reveal whether the email exists (no user enumeration).
- **Reset password:** `/reset-password?token=...` — set new password from link in email. Tokens expire in 1 hour and are single-use.
- **Change password (logged in):** Dashboard → Settings → Change password (current + new).
- **Password reset email:** When `RESEND_API_KEY` is set, reset links are sent by email via Resend. Set `RESEND_FROM_EMAIL` to a verified sender (e.g. `Support Hubs <noreply@yourdomain.com>`). Without Resend, in development the link is logged to the server console.

## Legal and public pages

- [ ] **Legal pages:** `/legal/privacy`, `/legal/terms`, and `/legal/cookies` exist with placeholder content. Before production, replace with your final legal text and update “Last updated” dates.
- [ ] **Footer:** Public footer links to Privacy, Terms, and Cookies.

## Optional production hardening

- **HTTPS:** Serve the app over HTTPS (most platforms provide this).
- **Session cookie:** Session cookie is already set with `secure: true` in production and `sameSite: "lax"`. Adjust in `lib/auth` if you need different cookie settings (e.g. domain, `sameSite: "strict"`).
- **Health check:** `GET /api/health` returns `{ ok: true, database: "connected" | "disconnected" }` for load balancers or monitoring.
- **Sitemap & robots:** `/sitemap.xml` and `/robots.txt` are generated from `app/sitemap.ts` and `app/robots.ts`. Set `NEXT_PUBLIC_APP_URL` so URLs are correct.
- **Error handling:** Root `error.tsx` and `not-found.tsx` provide friendly error and 404 pages.

For a full overview of what is production-ready and recommended next steps (e.g. rate limiting, env validation), see **`docs/PRODUCTION_READINESS.md`**.

## Quick commands

```bash
npm run type-check
npm run lint
npm run build
npm run db:migrate:deploy
npm run db:seed
```

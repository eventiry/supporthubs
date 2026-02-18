# Testing multi-tenant domains locally

You can test multiple tenants (organizations) on your machine in two ways.

## Option 1: Use `*.localhost` subdomains (recommended)

Browsers resolve `*.localhost` to `127.0.0.1`, so no hosts file changes are needed.

1. **Platform (no tenant)**  
   - Open: `http://localhost:3000`  
   - Use this for platform admin login and platform dashboard.

2. **A specific tenant**  
   - Ensure an organization exists with the desired slug (e.g. `acme`).  
   - Open: `http://acme.localhost:3000`  
   - Log in with a user that belongs to that organization.  
   - All requests stay on `acme.localhost:3000`, so tenant context is correct.

3. **Create a tenant locally**  
   - Use the join flow (invitation or public join) so an org is created with a slug.  
   - The redirect after join goes to `http://<slug>.localhost:3000/login`.  
   - Or create an org via platform admin (Organizations) and open `http://<slug>.localhost:3000` manually.

**Default org on plain localhost**  
- If you use only `http://localhost:3000` (no subdomain), the app resolves the tenant as the organization with slug **`default`**.  
- Ensure you have an org with `slug = "default"` if you want single-tenant behaviour on `localhost:3000`, or use a subdomain for each tenant.

## Option 2: `?tenant=` on the login page only

If you don’t use subdomains:

- Open `http://localhost:3000/login?tenant=acme` (replace `acme` with a real org slug).  
- Log in with a user for that org.  
- **Limitation:** After login, you’re on `localhost:3000` and the tenant is not in the URL, so tenant resolution falls back to the **default** org. So this is mainly useful for the login step; for full tenant behaviour use Option 1.

## Summary

| URL | Tenant |
|-----|--------|
| `http://localhost:3000` | Org with slug `default` (or platform if no tenant) |
| `http://acme.localhost:3000` | Org with slug `acme` |
| `http://localhost:3000/login?tenant=acme` | Resolves to tenant `acme` for that request only |

No `hosts` file or `APP_DOMAIN` change is required for `*.localhost`; the app treats `*.localhost` as subdomains when `APP_DOMAIN` is unset or `localhost`.

/**
 * Optional server-side env validation for production.
 * Call validateEnv() early (e.g. in instrumentation.ts or a startup check) to fail fast if required vars are missing.
 * Only runs when NODE_ENV=production (or set VALIDATE_ENV=true).
 */

const REQUIRED = ["DATABASE_URL"] as const;

const RECOMMENDED = [
  "NEXTAUTH_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "CONTACT_EMAIL",
] as const;

export interface EnvValidationResult {
  ok: boolean;
  missingRequired: string[];
  missingRecommended: string[];
  message?: string;
}

export function validateEnv(): EnvValidationResult {
  const shouldValidate =
    process.env.NODE_ENV === "production" || process.env.VALIDATE_ENV === "true";
  if (!shouldValidate) {
    return { ok: true, missingRequired: [], missingRecommended: [] };
  }

  const missingRequired = REQUIRED.filter(
    (key) => !process.env[key]?.trim()
  );
  const missingRecommended = RECOMMENDED.filter(
    (key) => !process.env[key]?.trim()
  );

  const ok = missingRequired.length === 0;
  let message: string | undefined;
  if (!ok) {
    message = `Missing required env: ${missingRequired.join(", ")}`;
  } else if (missingRecommended.length > 0) {
    message = `Missing recommended env (app may not work fully): ${missingRecommended.join(", ")}`;
  }

  return {
    ok,
    missingRequired,
    missingRecommended,
    message,
  };
}

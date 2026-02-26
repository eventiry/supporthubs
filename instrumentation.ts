/**
 * Next.js instrumentation: runs once per server instance on cold boot.
 * Used for production env validation so the server fails fast if required vars are missing.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { validateEnv } = await import("./lib/env");
  const result = validateEnv();
  if (!result.ok) {
    const msg = result.message ?? `Missing required env: ${result.missingRequired.join(", ")}`;
    throw new Error(`[Env validation] ${msg}`);
  }
  if (result.missingRecommended.length > 0 && process.env.NODE_ENV === "production") {
    // Log but do not throw; app can run with reduced functionality
    console.warn(
      "[Env validation] Missing recommended:",
      result.missingRecommended.join(", ")
    );
  }
}

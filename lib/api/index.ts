/**
 * Support Hubs API client.
 * Single export point: client class, factory, singleton, and errors.
 */

export { ApiClient } from "./client";
export {
  ApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "./errors";

import { ApiClient } from "./client";

function getBaseUrl(): string {
  if (typeof window !== "undefined") return "";
  return (
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_APP_URL) ||
    "http://localhost:3000"
  );
}

export function createApiClient(
  baseUrl?: string,
  getToken?: () => Promise<string | null> | string | null
): ApiClient {
  return new ApiClient(baseUrl ?? getBaseUrl(), getToken);
}

/** Singleton API client. Browser: same origin. Server: NEXT_PUBLIC_APP_URL or localhost:3000. */
export const api = createApiClient(getBaseUrl());

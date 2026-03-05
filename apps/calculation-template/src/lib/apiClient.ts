import { createApiClient } from "@eng-suite/api-client"

/**
 * Singleton API client for the venting-calculation app.
 * Uses NEXT_PUBLIC_API_URL env var (falls back to localhost:8000).
 */
export const apiClient = createApiClient(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  // No auth token — venting app has no login flow
  null
)

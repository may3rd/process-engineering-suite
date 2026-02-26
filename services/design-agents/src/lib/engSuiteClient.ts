import { createApiClient } from "@eng-suite/api-client"

/**
 * Shared API client for design-agents → centralised database.
 * Uses Vite env var (VITE_API_URL) — falls back to localhost:8000.
 */
export const engSuiteClient = createApiClient(
  import.meta.env.VITE_API_URL ?? "http://localhost:8000",
  null
)

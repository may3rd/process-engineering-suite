import { createApiClient } from "@eng-suite/api-client"

/**
 * Shared API client for network-editor → centralised database.
 * Separate from the existing hydraulics apiClient.ts to avoid conflicts.
 */
export const engSuiteClient = createApiClient(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  null
)

import { createApiClient } from '@eng-suite/api-client';

export const apiClient = createApiClient(
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000',
  null,
);

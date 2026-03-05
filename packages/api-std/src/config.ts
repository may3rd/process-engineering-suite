/**
 * API URL configuration for all frontends
 * Supports local, AWS, and Vercel deployment environments
 */

/**
 * Get the API URL based on deployment environment
 *
 * Priority:
 * 1. Explicit NEXT_PUBLIC_API_URL (or VITE_API_URL for Vite apps)
 * 2. Environment-specific defaults based on DEPLOYMENT_ENV
 *
 * @returns The API base URL to use for all API requests
 */
export function getApiUrl(): string {
  // Check for explicit override (works for both Next.js and Vite)
  const explicitUrl =
    typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL);

  if (explicitUrl) {
    return explicitUrl;
  }

  // Detect deployment environment
  const deploymentEnv =
    typeof process !== 'undefined' && process.env?.DEPLOYMENT_ENV ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEPLOYMENT_ENV) ||
    'local';

  // Return environment-specific defaults
  switch (deploymentEnv) {
    case 'aws':
      // ECS service-to-service communication uses service discovery
      return 'http://api:8000';

    case 'vercel':
      // Vercel should always have explicit URL configured
      throw new Error('NEXT_PUBLIC_API_URL must be set for Vercel deployments');

    case 'local':
    default:
      // Local development uses localhost
      return 'http://localhost:8000';
  }
}

/**
 * Validate API configuration on startup
 * Call this in your app initialization to catch config errors early
 */
export function validateApiConfig(): void {
  try {
    const url = getApiUrl();
    console.log(`[API Config] Using API URL: ${url}`);
  } catch (error) {
    console.error('[API Config] Invalid configuration:', error);
    throw error;
  }
}

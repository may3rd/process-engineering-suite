/**
 * Core API client factory.
 * Zero Node.js dependencies — uses plain fetch only.
 * Works in Next.js (server + client) and Vite (browser).
 */

import { createAuthModule } from "./modules/auth";
import { createEquipmentModule } from "./modules/equipment";
import { createHierarchyModule } from "./modules/hierarchy";
import { createPsvModule } from "./modules/psv";
import { createVentingModule } from "./modules/venting";
import { createNetworkModule } from "./modules/network";
import { createDesignAgentsModule } from "./modules/designAgents";
import { createHydraulicsModule } from "./modules/hydraulics";
import { createEngineeringObjectsModule } from "./modules/engineeringObjects";

export interface ApiClientConfig {
  baseUrl?: string;
  token?: string | null;
}

/** Internal request function — shared by all modules. */
export type RequestFn = <T>(endpoint: string, options?: RequestInit) => Promise<T>;

async function request<T>(
  baseUrl: string,
  endpoint: string,
  token: string | null,
  options: RequestInit = {}
): Promise<T> {
  const url = `${baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    throw new Error(`Failed to reach ${url}: ${msg}`);
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    let detail: string | null = null;
    if (contentType.includes("application/json")) {
      const body = await response.json().catch(() => null);
      detail = typeof body === "string" ? body : (body?.detail ?? null);
    } else {
      detail = await response.text().catch(() => null);
    }
    throw new Error(detail ?? `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as unknown as T;
  return response.json() as Promise<T>;
}

/**
 * Create a typed API client for the Process Engineering Suite backend.
 *
 * @param baseUrl - Base URL of the FastAPI server (default: http://localhost:8000)
 * @param token   - Bearer token for authenticated routes (null = no auth header)
 *
 * @example Next.js app
 * ```ts
 * const api = createApiClient(process.env.NEXT_PUBLIC_API_URL, localStorage.getItem("accessToken"));
 * ```
 * @example Vite app
 * ```ts
 * const api = createApiClient(import.meta.env.VITE_API_URL, null);
 * ```
 */
export function createApiClient(
  baseUrl: string = "http://localhost:8000",
  token: string | null = null
) {
  const req: RequestFn = <T>(endpoint: string, options?: RequestInit) =>
    request<T>(baseUrl, endpoint, token, options);

  return {
    auth: createAuthModule(req),
    equipment: createEquipmentModule(req),
    hierarchy: createHierarchyModule(req),
    psv: createPsvModule(req),
    venting: createVentingModule(req),
    network: createNetworkModule(req),
    designAgents: createDesignAgentsModule(req),
    hydraulics: createHydraulicsModule(req),
    engineeringObjects: createEngineeringObjectsModule(req),
  };
}

export type EngSuiteApiClient = ReturnType<typeof createApiClient>;

/**
 * Vessel app API client — equipment link endpoints.
 *
 * Connects to the FastAPI backend (NEXT_PUBLIC_API_URL, default localhost:8000).
 * Only the engineering-objects endpoints are used by this app.
 */

import type { EngineeringObjectPayload, EquipmentPushPayload } from '@/types'

const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:8000'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status}: ${detail}`)
  }
  return res.json() as Promise<T>
}

/**
 * Fetch an engineering object by tag.
 * Returns null if the object does not exist (404).
 * Throws for all other errors.
 */
export async function fetchEquipmentObject(tag: string): Promise<EngineeringObjectPayload | null> {
  try {
    return await apiFetch<EngineeringObjectPayload>(`/engineering-objects/${encodeURIComponent(tag)}`)
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('API 404')) return null
    throw err
  }
}

/**
 * Create or update an engineering object by tag (upsert).
 */
export async function upsertEquipmentObject(
  tag: string,
  payload: EquipmentPushPayload,
): Promise<EngineeringObjectPayload> {
  return apiFetch<EngineeringObjectPayload>(`/engineering-objects/${encodeURIComponent(tag)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

"use client"

import { useCallback, useState } from "react"
import { apiClient } from "@/lib/apiClient"
import type { CalculationMetadata, RevisionRecord } from "@/types"

export const PUMP_CALCULATION_OBJECT_TYPE = "PUMP_CALCULATION"

export interface SavedCalculationItem {
  id: string
  tag: string
  name: string
  description: string
  inputs: Record<string, unknown>
  results?: Record<string, unknown>
  calculationMetadata?: CalculationMetadata
  revisionHistory?: RevisionRecord[]
  status?: string | null
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

interface SavePayload {
  tag?: string
  name: string
  description?: string
  inputs: Record<string, unknown>
  results?: Record<string, unknown> | null
  calculationMetadata?: CalculationMetadata
  revisionHistory?: RevisionRecord[]
}

function createObjectTag(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `PCALC-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`
  }
  return `PCALC-${Date.now().toString(36).toUpperCase()}`
}

function parseSavedItem(raw: {
  tag: string
  object_type: string
  properties: Record<string, unknown>
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
}): SavedCalculationItem {
  const props = raw.properties ?? {}
  const meta = (props.meta ?? {}) as Record<string, unknown>
  const name = String(meta.name ?? raw.tag)
  const description = String(meta.description ?? "")
  const isActive = meta.isActive !== false

  return {
    id: raw.tag,
    tag: raw.tag,
    name,
    description,
    inputs: (props.inputs ?? {}) as Record<string, unknown>,
    results: (props.result ?? undefined) as Record<string, unknown> | undefined,
    calculationMetadata: props.calculationMetadata as CalculationMetadata | undefined,
    revisionHistory: props.revisionHistory as RevisionRecord[] | undefined,
    status: raw.status ?? null,
    isActive,
    createdAt: (raw.created_at ?? (meta.createdAt as string | undefined) ?? undefined) ?? undefined,
    updatedAt: (raw.updated_at ?? (meta.updatedAt as string | undefined) ?? undefined) ?? undefined,
  }
}

export function useSavedCalculations() {
  const objectType = PUMP_CALCULATION_OBJECT_TYPE
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [savedItems, setSavedItems] = useState<SavedCalculationItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(async ({
    tag,
    name,
    description,
    inputs,
    results,
    calculationMetadata,
    revisionHistory,
  }: SavePayload) => {
    setIsSaving(true)
    setError(null)
    try {
      const targetTag = tag?.trim() ? tag.trim().toUpperCase() : createObjectTag()
      const now = new Date().toISOString()
      const payload = {
        object_type: objectType,
        status: "In-Design",
        properties: {
          inputs,
          result: results ?? null,
          calculationMetadata: calculationMetadata ?? undefined,
          revisionHistory: revisionHistory ?? [],
          meta: {
            app: "pump-calculation",
            name: name.trim(),
            description: description?.trim() ?? "",
            isActive: true,
            deletedAt: null,
            updatedAt: now,
          },
        },
      }
      const item = await apiClient.engineeringObjects.upsert(targetTag, payload)
      return parseSavedItem(item)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed"
      setError(msg)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [objectType])

  const softDelete = useCallback(async (tag: string) => {
    setIsDeleting(true)
    setError(null)
    try {
      const item = await apiClient.engineeringObjects.get(tag)
      const props = (item.properties ?? {}) as Record<string, unknown>
      const meta = (props.meta ?? {}) as Record<string, unknown>
      await apiClient.engineeringObjects.upsert(tag, {
        object_type: item.object_type,
        status: item.status ?? "In-Design",
        properties: {
          ...props,
          meta: {
            ...meta,
            isActive: false,
            deletedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      })
      setSavedItems((prev) => prev.map((entry) => (entry.tag === tag ? { ...entry, isActive: false } : entry)))
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed"
      setError(msg)
      throw err
    } finally {
      setIsDeleting(false)
    }
  }, [])

  const restore = useCallback(async (tag: string) => {
    setIsRestoring(true)
    setError(null)
    try {
      const item = await apiClient.engineeringObjects.get(tag)
      const props = (item.properties ?? {}) as Record<string, unknown>
      const meta = (props.meta ?? {}) as Record<string, unknown>
      const restored = await apiClient.engineeringObjects.upsert(tag, {
        object_type: item.object_type,
        status: item.status ?? "In-Design",
        properties: {
          ...props,
          meta: {
            ...meta,
            isActive: true,
            deletedAt: null,
            updatedAt: new Date().toISOString(),
          },
        },
      })
      const parsed = parseSavedItem(restored)
      setSavedItems((prev) => prev.map((entry) => (entry.tag === tag ? parsed : entry)))
      return parsed
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Restore failed"
      setError(msg)
      throw err
    } finally {
      setIsRestoring(false)
    }
  }, [])

  const fetchList = useCallback(async (params?: { includeInactive?: boolean; q?: string }) => {
    setIsLoading(true)
    setError(null)
    try {
      const items = await apiClient.engineeringObjects.list({
        objectType,
        includeInactive: params?.includeInactive ?? false,
        q: params?.q,
      })
      const parsed = items.map(parseSavedItem)
      setSavedItems(parsed)
      return parsed
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load calculations"
      setError(msg)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [objectType])

  return {
    save,
    softDelete,
    restore,
    fetchList,
    isSaving,
    isLoading,
    isDeleting,
    isRestoring,
    savedItems,
    error,
  }
}

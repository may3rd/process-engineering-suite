"use client"

import { useState, useCallback } from "react"
import { apiClient } from "@/lib/apiClient"
import type { CalculationMetadata, RevisionRecord } from "@/types"

const VENTING_CALCULATION_APP = "venting-calculation"

interface VentingCalculation {
  id: string
  app: string
  name: string
  description: string
  status: string
  isActive: boolean
  inputs: Record<string, unknown>
  results?: Record<string, unknown> | null
  metadata?: CalculationMetadata
  revisionHistory?: RevisionRecord[]
  linkedEquipmentId?: string | null
  linkedEquipmentTag?: string | null
  equipmentId?: string | null
  equipmentTag?: string | null
  calculationMetadata?: CalculationMetadata
  apiEdition?: string
  latestVersionId?: string | null
  latestVersionNo?: number
  createdAt?: string | null
  updatedAt?: string | null
}

function parseSavedItem(raw: {
  id: string
  app: string
  name: string
  description: string
  status: string
  isActive: boolean
  inputs: Record<string, unknown>
  results?: Record<string, unknown> | null
  metadata?: Record<string, unknown>
  revisionHistory?: Array<Record<string, unknown>>
  linkedEquipmentId?: string | null
  linkedEquipmentTag?: string | null
  latestVersionId?: string | null
  latestVersionNo?: number
  createdAt?: string | null
  updatedAt?: string | null
}): VentingCalculation {
  const { metadata: _metadata, linkedEquipmentId, linkedEquipmentTag, ...rest } = raw
  return {
    ...rest,
    revisionHistory: (raw.revisionHistory as RevisionRecord[] | undefined) ?? undefined,
    linkedEquipmentId,
    linkedEquipmentTag,
    equipmentId: linkedEquipmentId ?? null,
    equipmentTag: linkedEquipmentTag ?? null,
    calculationMetadata: (_metadata as CalculationMetadata | undefined) ?? undefined,
    apiEdition: typeof raw.inputs.apiEdition === 'string' ? raw.inputs.apiEdition : '7TH',
  }
}

/**
 * Hook for saving and loading venting calculations from the central API.
 *
 * Usage:
 *   const { save, list, isSaving, isLoading, savedItems } = useSavedCalculations()
 */
export function useSavedCalculations() {
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [savedItems, setSavedItems] = useState<VentingCalculation[]>([])
  const [error, setError] = useState<string | null>(null)

  /** Persist current inputs + results under a human-readable name. */
  const save = useCallback(
    async (
      name: string,
      inputs: Record<string, unknown>,
      results?: Record<string, unknown> | null,
      equipmentId?: string | null,
      calculationMetadata?: CalculationMetadata,
      revisionHistory?: RevisionRecord[],
    ) => {
      setIsSaving(true)
      setError(null)
      try {
        const payload = {
          app: VENTING_CALCULATION_APP,
          name,
          description: typeof inputs.description === "string" ? inputs.description : "",
          status: "draft",
          tag: typeof inputs.tankNumber === "string" ? inputs.tankNumber : null,
          inputs,
          results: results ?? null,
          metadata: (calculationMetadata ?? {}) as unknown as Record<string, unknown>,
          revisionHistory: (revisionHistory ?? []) as unknown as Array<Record<string, unknown>>,
          linkedEquipmentId: equipmentId ?? null,
          linkedEquipmentTag: null,
        }
        const created = await apiClient.calculations.create(payload)
        return created
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Save failed"
        setError(msg)
        throw err
      } finally {
        setIsSaving(false)
      }
    },
    []
  )

  const overwrite = useCallback(
    async (
      id: string,
      name: string,
      inputs: Record<string, unknown>,
      results?: Record<string, unknown> | null,
      calculationMetadata?: CalculationMetadata,
      revisionHistory?: RevisionRecord[],
    ) => {
      setIsSaving(true)
      setError(null)
      try {
        const payload = {
          name,
          description: typeof inputs.description === "string" ? inputs.description : "",
          status: "draft",
          tag: typeof inputs.tankNumber === "string" ? inputs.tankNumber : null,
          inputs,
          results: results ?? null,
          metadata: (calculationMetadata ?? {}) as unknown as Record<string, unknown>,
          revisionHistory: (revisionHistory ?? []) as unknown as Array<Record<string, unknown>>,
        }
        const updated = await apiClient.calculations.saveVersion(id, payload)
        return updated
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Overwrite failed"
        setError(msg)
        throw err
      } finally {
        setIsSaving(false)
      }
    },
    []
  )

  /** Fetch all saved calculations from the API. */
  const fetchList = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const items = (await apiClient.calculations.list({ app: VENTING_CALCULATION_APP })).map(parseSavedItem)
      setSavedItems(items)
      return items
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load calculations"
      setError(msg)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    setIsDeleting(true)
    setError(null)
    try {
      await apiClient.calculations.softDelete(id)
      setSavedItems((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed"
      setError(msg)
      throw err
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return { save, overwrite, remove, fetchList, isSaving, isLoading, isDeleting, savedItems, error }
}

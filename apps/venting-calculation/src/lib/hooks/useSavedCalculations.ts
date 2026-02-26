"use client"

import { useState, useCallback } from "react"
import { apiClient } from "@/lib/apiClient"
import type { components } from "@eng-suite/types"
import type { CalculationMetadata, RevisionRecord } from "@/types"

type VentingCalculation = components["schemas"]["VentingCalculationResponse"]

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
        const payload: Record<string, unknown> = {
          name,
          inputs,
          results: results ?? undefined,
          apiEdition: (inputs.apiEdition as string | undefined) ?? "7TH",
          ...(equipmentId ? { equipmentId } : {}),
          calculationMetadata: calculationMetadata ?? undefined,
          revisionHistory: revisionHistory ?? [],
        }
        const created = await apiClient.venting.create(
          payload as unknown as components["schemas"]["VentingCalculationCreate"]
        )
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
        const payload: Record<string, unknown> = {
          name,
          inputs,
          results: results ?? undefined,
          apiEdition: (inputs.apiEdition as string | undefined) ?? "7TH",
          calculationMetadata: calculationMetadata ?? undefined,
          revisionHistory: revisionHistory ?? [],
          isActive: true,
        }
        const updated = await apiClient.venting.update(
          id,
          payload as unknown as components["schemas"]["VentingCalculationUpdate"]
        )
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
      const items = await apiClient.venting.list()
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
      await apiClient.venting.delete(id)
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

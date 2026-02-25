"use client"

import { useState, useCallback } from "react"
import { apiClient } from "@/lib/apiClient"
import type { components } from "@eng-suite/types"

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
  const [savedItems, setSavedItems] = useState<VentingCalculation[]>([])
  const [error, setError] = useState<string | null>(null)

  /** Persist current inputs + results under a human-readable name. */
  const save = useCallback(
    async (
      name: string,
      inputs: Record<string, unknown>,
      results?: Record<string, unknown> | null,
      equipmentId?: string | null,
    ) => {
      setIsSaving(true)
      setError(null)
      try {
        const created = await apiClient.venting.create({
          name,
          inputs,
          results: results ?? undefined,
          apiEdition: (inputs.apiEdition as string | undefined) ?? "7TH",
          ...(equipmentId ? { equipmentId } : {}),
        })
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

  return { save, fetchList, isSaving, isLoading, savedItems, error }
}

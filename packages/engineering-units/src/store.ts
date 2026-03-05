/**
 * Generic Zustand UoM store factory.
 *
 * Usage:
 *   import { createUomStore } from '@eng-suite/engineering-units'
 *   import { BASE_UNITS } from '@/lib/uom'
 *
 *   export const useUomStore = createUomStore('my-app-uom-prefs', BASE_UNITS)
 *
 * The factory:
 *  - Persists user preferences to localStorage under `storeName`
 *  - Includes a `migrate` function that merges `defaultUnits` with any stale
 *    persisted state so newly-added categories always get a sensible default
 *  - Infers the full set of category keys from `defaultUnits` for type safety
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UomStoreState<T extends Record<string, string>> {
  units: T
  setUnit: (category: keyof T, unit: string) => void
}

/**
 * Creates a persisted Zustand store for unit-of-measure display preferences.
 *
 * @param storeName   localStorage key (e.g. 'vent-uom-prefs')
 * @param defaultUnits  Map of category → base/default unit string
 */
export function createUomStore<T extends Record<string, string>>(
  storeName: string,
  defaultUnits: T,
) {
  return create<UomStoreState<T>>()(
    persist(
      (set) => ({
        units: { ...defaultUnits },
        setUnit: (category, unit) =>
          set((s) => ({ units: { ...s.units, [category]: unit } })),
      }),
      {
        name: storeName,
        migrate: (persistedState: unknown) => {
          // Merge defaultUnits so newly-added categories always have a value
          const ps = persistedState as { state?: { units?: Record<string, string> } }
          if (ps?.state?.units) {
            ps.state.units = { ...defaultUnits, ...ps.state.units }
          }
          return ps
        },
      },
    ),
  )
}

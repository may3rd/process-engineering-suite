/**
 * UoM preferences store (Zustand with localStorage persistence).
 * Stores the user's selected display unit per category.
 * Persists to localStorage key: 'vent-uom-prefs'
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BASE_UNITS, type UomCategory } from '../uom'

interface UomState {
  units: Record<UomCategory, string>
  setUnit: (category: UomCategory, unit: string) => void
}

export const useUomStore = create<UomState>()(
  persist(
    (set) => ({
      units: { ...BASE_UNITS },
      setUnit: (category, unit) =>
        set((s) => ({
          units: { ...s.units, [category]: unit },
        })),
    }),
    {
      name: 'vent-uom-prefs',
      migrate: (persistedState: any, version: number) => {
        // Ensure all BASE_UNITS categories are present (handles schema evolution)
        if (persistedState?.state?.units) {
          persistedState.state.units = { ...BASE_UNITS, ...persistedState.state.units }
        }
        return persistedState
      },
    }
  )
)

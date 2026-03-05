import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BASE_UNITS, type UomCategory } from '../uom'

interface UomState {
  units: Record<UomCategory, string>
  setUnit: (category: UomCategory, unit: string) => void
}

/**
 * uomStore — Persists user's unit display preferences in localStorage.
 * Initialized with BASE_UNITS.
 */
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
      name: 'calculator-template-uom-prefs',
      migrate: (persistedState: any) => {
        // Migration: ensure new categories from code-updates are present even in old localStorages.
        if (persistedState?.state?.units) {
          persistedState.state.units = {
            ...BASE_UNITS,
            ...persistedState.state.units,
          }
        }
        return persistedState
      },
    }
  )
)

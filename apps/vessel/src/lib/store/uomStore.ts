import { createUomStore } from '@eng-suite/engineering-units'
import { BASE_UNITS } from '@/lib/uom'

/**
 * UoM preference store for the vessel calculator.
 * Persists user's display unit selections to localStorage.
 */
export const useUomStore = createUomStore('vessel-uom-prefs', BASE_UNITS)

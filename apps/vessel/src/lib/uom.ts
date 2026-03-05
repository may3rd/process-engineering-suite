/**
 * Vessel app UoM configuration.
 * Re-exports from @eng-suite/engineering-units and defines the
 * vessel-specific subset of BASE_UNITS for the UoM store.
 */
import {
  UOM_OPTIONS as SHARED_UOM_OPTIONS,
  BASE_UNITS as SHARED_BASE_UNITS,
  UOM_LABEL as SHARED_UOM_LABEL,
  type UomCategory,
} from '@eng-suite/engineering-units'

export type { UomCategory }
export { SHARED_UOM_OPTIONS as UOM_OPTIONS }
export { SHARED_UOM_LABEL as UOM_LABEL }

/**
 * Base units for the vessel app UoM store.
 * Only includes categories used by this app.
 */
export const BASE_UNITS = {
  length:     'mm'                          as const, // vessel geometry stored in mm
  density:    SHARED_BASE_UNITS.density,    // kg/m3
  volumeFlow: SHARED_BASE_UNITS.volumeFlow, // m3/h
  volume:     SHARED_BASE_UNITS.volume,     // m3
  area:       SHARED_BASE_UNITS.area,       // m2
  mass:       SHARED_BASE_UNITS.mass,       // kg
} as const

export type VesselUomCategory = keyof typeof BASE_UNITS

/** Returns the list of selectable unit strings for a vessel UoM category. */
export function vesselUomOptions(category: VesselUomCategory): readonly string[] {
  return (SHARED_UOM_OPTIONS as Record<string, readonly string[]>)[category] ?? []
}

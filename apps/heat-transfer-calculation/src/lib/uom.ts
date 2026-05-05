/**
 * Heat Transfer app UoM configuration.
 *
 * Uses shared @eng-suite/engineering-units categories with heat-transfer-specific
 * BASE_UNITS overrides (mm for length instead of m, W for power instead of kW).
 *
 * Categories not in shared package (velocity, specificHeat, expansionCoeff, coolingRate)
 * use plain <Input> with hardcoded unit badges in the form sections.
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
 * Base units for the heat transfer app UoM store.
 * Only includes categories that have UoM selectors.
 *
 * Overrides:
 *   - length: mm (shared default is m)
 *   - power: W (shared default is kW)
 */
export const BASE_UNITS = {
  length:              'mm'                          as const,
  temperature:         SHARED_BASE_UNITS.temperature, // °C
  thermalConductivity: SHARED_BASE_UNITS.thermalConductivity, // W/(m·K)
  heatTransferCoeff:   SHARED_BASE_UNITS.heatTransferCoeff,   // W/(m²·K)
  density:             SHARED_BASE_UNITS.density,    // kg/m³
  viscosity:           SHARED_BASE_UNITS.viscosity,  // Pa·s
  area:                SHARED_BASE_UNITS.area,       // m²
  power:               'W'                           as const, // overrides kW
  time:                'h'                           as const, // overrides s
  velocity:            'm/s'                         as const,
  specificHeat:        'J/(kg·K)'                    as const,
  expansionCoeff:      '1/K'                         as const,
  coolingRate:         '°C/h'                        as const,
} as const

export type HeatTransferUomCategory = keyof typeof BASE_UNITS

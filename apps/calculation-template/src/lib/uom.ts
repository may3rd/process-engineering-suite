/**
 * Unit of Measure (UoM) constants for the venting calculator.
 *
 * The canonical UOM_OPTIONS, BASE_UNITS, UOM_LABEL, and UomCategory type are
 * now defined in the shared `@eng-suite/engineering-units` package and
 * re-exported from here for backward compatibility with local imports.
 *
 * App-specific additions (e.g. GAUGE_PRESSURE_RANGES) live below.
 */

export {
  UOM_OPTIONS,
  BASE_UNITS,
  UOM_LABEL,
  type UomCategory,
} from '@eng-suite/engineering-units'

/**
 * Min/max hints for design pressure by unit.
 * Used in form hints to show validation ranges.
 */
export const GAUGE_PRESSURE_RANGES: Record<string, { min: number; max: number }> = {
  kPag:      { min: -101.3, max: 103.4 },
  barg:      { min: -1.0,   max: 1.019 },
  psig:      { min: -14.7,  max: 15.0 },
  'kg/cm2g': { min: -1.033, max: 1.052 },
}

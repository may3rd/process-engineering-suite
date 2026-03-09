/**
 * UoM constants for the pump calculation app.
 *
 * Re-exports from @eng-suite/engineering-units with pump-specific BASE_UNITS overrides.
 * Key differences from shared defaults:
 *   - absolutePressure base: kPa (not Pa)
 *   - viscosity base: cP (not Pa.s)
 *   - length base: m (for elevation & head)
 *   - power base: kW
 */

export { UOM_OPTIONS, UOM_LABEL, type UomCategory } from '@eng-suite/engineering-units'

export const BASE_UNITS = {
  volumeFlow:       'm3/h',
  temperature:      'C',
  length:           'm',
  absolutePressure: 'kPa',
  gaugePressure:    'kPag',
  /** Combined absolute + gauge — use for source/destination vessel pressures. */
  pressure:         'kPa',
  viscosity:        'cP',
  power:            'kW',
} as const

export type PumpUomCategory = keyof typeof BASE_UNITS

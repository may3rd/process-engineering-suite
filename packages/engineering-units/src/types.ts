/**
 * Core UoM type definitions shared across all apps in the monorepo.
 *
 * Unit keys always use ASCII strings (e.g. m3/h, Nm3/h, C) so they are
 * compatible with the physics-engine's convertUnit function.  Display
 * labels (unicode superscripts, degree signs, etc.) live in UOM_LABEL.
 */

export const UOM_OPTIONS = {
  length:              ['mm', 'in', 'm', 'cm', 'ft'],
  gaugePressure:       ['kPag', 'barg', 'psig', 'kg/cm2g'],
  absolutePressure:    ['kPa', 'bar', 'psi', 'atm'],
  temperature:         ['C', 'F', 'K'],
  volumeFlow:          ['m3/h', 'ft3/h'],
  ventRate:            ['Nm3/h', 'MSCFD', 'ft3/h'],
  massFlow:            ['kg/h', 'lb/h', 'ton/day'],
  energy:              ['kJ/kg', 'kcal/kg', 'Btu/lb'],
  thermalConductivity: ['W/(m·K)', 'Btu/(h·ft·°F)', 'kcal/(h·m·K)'],
  heatTransferCoeff:   ['W/(m²·K)', 'Btu/(h·ft²·°F)', 'kcal/(h·m²·K)'],
  density:             ['kg/m3', 'lb/ft3', 'g/cm3'],
  viscosity:           ['Pa.s', 'cP', 'mPa.s'],
} as const

export type UomCategory = keyof typeof UOM_OPTIONS

/** The canonical base unit for each category (always stored in form state). */
export const BASE_UNITS: Record<UomCategory, string> = {
  length:              'mm',
  gaugePressure:       'kPag',
  absolutePressure:    'kPa',
  temperature:         'C',
  volumeFlow:          'm3/h',
  ventRate:            'Nm3/h',
  massFlow:            'kg/h',
  energy:              'kJ/kg',
  thermalConductivity: 'W/(m·K)',
  heatTransferCoeff:   'W/(m²·K)',
  density:             'kg/m3',
  viscosity:           'Pa.s',
}

/**
 * Pretty unicode display labels keyed by ASCII unit string.
 * Fall back to the raw key when a label is not listed.
 */
export const UOM_LABEL: Record<string, string> = {
  // Length
  mm: 'mm',
  in: 'in',
  m:  'm',
  cm: 'cm',
  ft: 'ft',
  // Gauge Pressure
  kPag:      'kPag',
  barg:      'barg',
  psig:      'psig',
  'kg/cm2g': 'kg/cm²g',
  // Absolute Pressure
  kPa: 'kPa',
  bar: 'bar',
  psi: 'psi',
  atm: 'atm',
  // Temperature
  C: '°C',
  F: '°F',
  K: 'K',
  // Volume Flow
  'm3/h':  'm³/h',
  'ft3/h': 'ft³/h',
  // Vent Rate
  'Nm3/h': 'Nm³/h',
  MSCFD:   'MSCFD',
  // Mass Flow
  'kg/h':    'kg/h',
  'lb/h':    'lb/h',
  'ton/day': 'ton/day',
  // Energy
  'kJ/kg':   'kJ/kg',
  'kcal/kg': 'kcal/kg',
  'Btu/lb':  'Btu/lb',
  // Thermal Conductivity
  'W/(m·K)':         'W/(m·K)',
  'Btu/(h·ft·°F)':   'Btu/(h·ft·°F)',
  'kcal/(h·m·K)':    'kcal/(h·m·K)',
  // Heat Transfer Coefficient
  'W/(m²·K)':        'W/(m²·K)',
  'Btu/(h·ft²·°F)':  'Btu/(h·ft²·°F)',
  'kcal/(h·m²·K)':   'kcal/(h·m²·K)',
  // Density
  'kg/m3':  'kg/m³',
  'lb/ft3': 'lb/ft³',
  'g/cm3':  'g/cm³',
  // Viscosity
  'Pa.s':  'Pa·s',
  cP:      'cP',
  'mPa.s': 'mPa·s',
}

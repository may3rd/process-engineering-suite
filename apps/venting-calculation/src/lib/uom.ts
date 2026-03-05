/**
 * Unit of Measure (UoM) constants and utilities for the venting calculator.
 * All unit keys use ASCII strings (e.g., m3/h, Nm3/h, C) compatible with convert-units.
 * Display labels map to prettier unicode versions (e.g., m³/h, Nm³/h, °C).
 */

export const UOM_OPTIONS = {
  length: ['mm', 'in', 'm', 'cm', 'ft'],
  gaugePressure: ['kPag', 'barg', 'psig', 'kg/cm2g'],
  absolutePressure: ['kPa', 'bar', 'psi', 'atm'],
  temperature: ['C', 'F', 'K'],
  volumeFlow: ['m3/h', 'ft3/h'],
  ventRate: ['Nm3/h', 'MSCFD', 'ft3/h'],
  energy: ['kJ/kg', 'kcal/kg', 'Btu/lb'],
  thermalConductivity: ['W/(m·K)', 'Btu/(h·ft·°F)', 'kcal/(h·m·K)'],
  heatTransferCoeff: ['W/(m²·K)', 'Btu/(h·ft²·°F)', 'kcal/(h·m²·K)'],
} as const

export type UomCategory = keyof typeof UOM_OPTIONS

export const BASE_UNITS: Record<UomCategory, string> = {
  length: 'mm',
  gaugePressure: 'kPag',
  absolutePressure: 'kPa',
  temperature: 'C',
  volumeFlow: 'm3/h',
  ventRate: 'Nm3/h',
  energy: 'kJ/kg',
  thermalConductivity: 'W/(m·K)',
  heatTransferCoeff: 'W/(m²·K)',
}

/**
 * Display labels for units (pretty unicode versions).
 * Keys are the internal ASCII unit strings.
 */
export const UOM_LABEL: Record<string, string> = {
  // Length
  mm: 'mm',
  in: 'in',
  m: 'm',
  cm: 'cm',
  ft: 'ft',
  // Gauge Pressure
  kPag: 'kPag',
  barg: 'barg',
  psig: 'psig',
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
  'm3/h': 'm³/h',
  'ft3/h': 'ft³/h',
  // Vent Rate
  'Nm3/h': 'Nm³/h',
  MSCFD: 'MSCFD',
  // Energy
  'kJ/kg': 'kJ/kg',
  'kcal/kg': 'kcal/kg',
  'Btu/lb': 'Btu/lb',
  // Thermal Conductivity
  'W/(m·K)': 'W/(m·K)',
  'Btu/(h·ft·°F)': 'Btu/(h·ft·°F)',
  'kcal/(h·m·K)': 'kcal/(h·m·K)',
  // Heat Transfer Coefficient
  'W/(m²·K)': 'W/(m²·K)',
  'Btu/(h·ft²·°F)': 'Btu/(h·ft²·°F)',
  'kcal/(h·m²·K)': 'kcal/(h·m²·K)',
}

/**
 * Min/max hints for design pressure by unit.
 * Used in form hints to show validation ranges.
 */
export const GAUGE_PRESSURE_RANGES: Record<string, { min: number; max: number }> = {
  kPag: { min: -101.3, max: 103.4 },
  barg: { min: -1.0, max: 1.019 },
  psig: { min: -14.7, max: 15.0 },
  'kg/cm2g': { min: -1.033, max: 1.052 },
}

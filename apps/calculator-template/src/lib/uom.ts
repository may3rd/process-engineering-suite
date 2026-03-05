export type UomCategory =
  | 'length'
  | 'gaugePressure'
  | 'absolutePressure'
  | 'temperature'
  | 'volumeFlow'
  | 'ventRate'
  | 'energy'
  | 'thermalConductivity'
  | 'heatTransferCoeff'
  | 'time'

/**
 * Base units are ALWAYS what we store in the form (Zustand or Hook Form).
 * Conversion is for display only.
 */
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
  time: 'hour',
}

/**
 * Available units per category for the user to select in the UI.
 */
export const UOM_OPTIONS: Record<UomCategory, string[]> = {
  length: ['mm', 'in', 'm', 'cm', 'ft'],
  gaugePressure: ['kPag', 'barg', 'psig', 'kg/cm2g'],
  absolutePressure: ['kPa', 'bar', 'psi', 'atm'],
  temperature: ['C', 'F', 'K'],
  volumeFlow: ['m3/h', 'ft3/h'],
  ventRate: ['Nm3/h', 'MSCFD', 'ft3/h'],
  energy: ['kJ/kg', 'kcal/kg', 'Btu/lb'],
  thermalConductivity: ['W/(m·K)', 'Btu/(h·ft·°F)', 'kcal/(h·m·K)'],
  heatTransferCoeff: ['W/(m²·K)', 'Btu/(h·ft²·°F)', 'kcal/(h·m²·K)'],
  time: ['hour', 'min', 's', 'day'],
}

/**
 * Pretty display labels for units (e.g., C → °C).
 */
export const UOM_LABEL: Record<string, string> = {
  mm: 'mm',
  in: 'in',
  m: 'm',
  cm: 'cm',
  ft: 'ft',
  C: '°C',
  F: '°F',
  K: 'K',
  kPag: 'kPag',
  barg: 'barg',
  psig: 'psig',
  'm3/h': 'm³/h',
  'ft3/h': 'ft³/h',
  'Nm3/h': 'Nm³/h',
  MSCFD: 'MSCFD',
  'kJ/kg': 'kJ/kg',
  'kcal/kg': 'kcal/kg',
  'Btu/lb': 'Btu/lb',
  'W/(m·K)': 'W/(m·K)',
  'W/(m²·K)': 'W/(m²·K)',
  hour: 'h',
  min: 'min',
  s: 's',
  day: 'd',
}

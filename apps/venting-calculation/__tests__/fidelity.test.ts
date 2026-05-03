/**
 * Venting-Calculation Formula Fidelity Tests
 *
 * Reference: API 2000 + `Book1 1.xlsx` (existing reference)
 * Tolerance: 10% for Q and venting rate
 *
 * Run: cd apps/venting-calculation && bun run test -- --reporter=verbose __tests__/fidelity.test.ts
 */

import { describe, it, expect } from 'vitest'
import { computeEmergencyVenting } from '../src/lib/calculations/emergencyVenting'
import { computeDerivedGeometry } from '../src/lib/calculations/geometry'
import { TankConfiguration } from '@/types'
import type { CalculationInput, DerivedGeometry } from '@/types'

function withinPct(actual: number, expected: number, tol: number): boolean {
  if (expected === 0) return actual === 0
  return Math.abs((actual - expected) / expected) * 100 <= tol
}

function report(name: string, actual: number, expected: number, tol: number): void {
  const dev = ((actual - expected) / expected) * 100
  const ok = withinPct(actual, expected, tol)
  console.log(`  ${ok ? '✓' : '✗'} ${name}: actual=${actual.toFixed(2)}, expected=${expected.toFixed(2)}, dev=${dev.toFixed(1)}% (tol ${tol}%)`)
}

// ─── Case VT-01: API 7th reference (bare, D=24000, H=17500, ATWS=689.44) ───
// ATWS ≥ 260, DP > 7 kPa → a=43200, n=0.82 (API 2000 Table 3)

const REF_INPUT: CalculationInput = {
  tankNumber: 'TK-3120',
  diameter: 24_000,
  height: 17_500,
  latitude: 12.7,
  designPressure: 101.32,
  tankConfiguration: TankConfiguration.BARE_METAL,
  avgStorageTemp: 35,
  vapourPressure: 5.6,
  flashBoilingPointType: 'FP',
  incomingStreams: [],
  outgoingStreams: [{ streamNo: 'S-1', flowrate: 368.9 }],
  apiEdition: '7TH',
}

const REF_DERIVED: DerivedGeometry = computeDerivedGeometry(REF_INPUT)

describe('Case VT-01: API 7th reference — ATWS=689.44 m², DP=101.32 kPa', () => {
  it('coefficients: a=43200, n=0.82 (ATWS≥260, DP>7)', () => {
    const r = computeEmergencyVenting(REF_INPUT, REF_DERIVED)
    expect(r.coefficients.a).toBe(43_200)
    expect(r.coefficients.n).toBe(0.82)
  })

  it('environmental factor F=1.0 (bare metal)', () => {
    const r = computeEmergencyVenting(REF_INPUT, REF_DERIVED)
    expect(r.environmentalFactor).toBe(1.0)
  })

  it('Q = 43,200 × 689.44^0.82 ≈ 9,184,416 W', () => {
    const r = computeEmergencyVenting(REF_INPUT, REF_DERIVED)
    expect(withinPct(r.heatInput, 9_184_416, 10)).toBe(true)
    report('VT-01: heatInput', r.heatInput, 9_184_416, 10)
  })

  it('emergency vent ≈ 44,264 Nm³/h (208.2 × F × ATWS^0.82)', () => {
    const r = computeEmergencyVenting(REF_INPUT, REF_DERIVED)
    expect(withinPct(r.emergencyVentRequired, 44_264, 10)).toBe(true)
    report('VT-01: emergencyVentRequired', r.emergencyVentRequired, 44_264, 10)
  })
})

// ─── Case VT-02: ATWS ≥ 260, DP ≤ 7 kPa → a=4129700, n=0 (fixed Q) ────────

describe('Case VT-02: ATWS≥260, DP≤7 kPa → a=4,129,700, n=0', () => {
  const input: CalculationInput = {
    tankNumber: 'TK-LARGE',
    diameter: 40_000,  // ATWS = π×40×min(20,7.62) = π×40×7.62 = 957.6 m² ≥ 260
    height: 20_000,
    latitude: 12.7,
    designPressure: 7,  // ≤ 7 kPa → a=4129700, n=0
    tankConfiguration: TankConfiguration.BARE_METAL,
    avgStorageTemp: 35,
    vapourPressure: 5.6,
    flashBoilingPointType: 'FP',
    incomingStreams: [],
    outgoingStreams: [],
    apiEdition: '7TH',
  }
  const derived = computeDerivedGeometry(input)

  it('coefficients: a=4,129,700, n=0', () => {
    const r = computeEmergencyVenting(input, derived)
    expect(r.coefficients.a).toBe(4_129_700)
    expect(r.coefficients.n).toBe(0)
  })

  it('F=1.0 (bare metal)', () => {
    const r = computeEmergencyVenting(input, derived)
    expect(r.environmentalFactor).toBe(1.0)
  })

  it('Q = a × ATWS^0 = 4,129,700 W (n=0, area independent)', () => {
    const r = computeEmergencyVenting(input, derived)
    expect(withinPct(r.heatInput, 4_129_700, 10)).toBe(true)
    report('VT-02: heatInput', r.heatInput, 4_129_700, 10)
  })
})

// ─── Case VT-03: ATWS < 18.6 m² → a=63150, n=1.0 ────────────────────────────

describe('Case VT-03: ATWS < 18.6 m² → a=63150, n=1.0', () => {
  const input: CalculationInput = {
    tankNumber: 'TK-SMALL',
    diameter: 1_000,  // shell = π×1×min(3,7.62) = 9.42 m² < 18.6
    height: 3_000,
    latitude: 12.7,
    designPressure: 15,
    tankConfiguration: TankConfiguration.BARE_METAL,  // Use BARE to avoid insulation error
    avgStorageTemp: 35,
    vapourPressure: 5.6,
    flashBoilingPointType: 'FP',
    incomingStreams: [],
    outgoingStreams: [],
    apiEdition: '7TH',
  }
  const derived = computeDerivedGeometry(input)

  it('coefficients: a=63150, n=1.0', () => {
    const r = computeEmergencyVenting(input, derived)
    expect(r.coefficients.a).toBe(63_150)
    expect(r.coefficients.n).toBe(1.0)
  })

  it('F=1.0 (bare metal)', () => {
    const r = computeEmergencyVenting(input, derived)
    expect(r.environmentalFactor).toBe(1.0)
  })

  it('Q = 63,150 × ATWS ≈ 63,150 × 9.42 ≈ 595,000 W', () => {
    const r = computeEmergencyVenting(input, derived)
    expect(withinPct(r.heatInput, 595_000, 15)).toBe(true)
    report('VT-03: heatInput', r.heatInput, 595_000, 15)
  })
})

// ─── Case VT-04: ATWS 18.6–93 m² → a=224200, n=0.566 ───────────────────────

describe('Case VT-04: ATWS 18.6–93 m² → a=224200, n=0.566', () => {
  const input: CalculationInput = {
    tankNumber: 'TK-MED',
    diameter: 3_000,  // ATWS = π×3×min(6,7.62) = π×3×6 = 56.55 m² (in 18.6–93 range)
    height: 6_000,
    latitude: 12.7,
    designPressure: 15,
    tankConfiguration: TankConfiguration.BARE_METAL,
    avgStorageTemp: 35,
    vapourPressure: 5.6,
    flashBoilingPointType: 'FP',
    incomingStreams: [],
    outgoingStreams: [],
    apiEdition: '7TH',
  }
  const derived = computeDerivedGeometry(input)

  it('coefficients: a=224200, n=0.566', () => {
    const r = computeEmergencyVenting(input, derived)
    expect(r.coefficients.a).toBe(224_200)
    expect(r.coefficients.n).toBe(0.566)
  })

  it('F=1.0 (bare metal)', () => {
    const r = computeEmergencyVenting(input, derived)
    expect(r.environmentalFactor).toBe(1.0)
  })

    it('Q = 224,200 × 56.55^0.566 ≈ 2,200,455 W', () => {
    const r = computeEmergencyVenting(input, derived)
    expect(withinPct(r.heatInput, 2_200_455, 10)).toBe(true)
    report('VT-04: heatInput', r.heatInput, 2_200_455, 10)
  })
})

// ─── Case VT-05: ATWS 93–260 m² → a=630400, n=0.338 ─────────────────────────

describe('Case VT-05: ATWS 93–260 m² → a=630400, n=0.338', () => {
  const input: CalculationInput = {
    tankNumber: 'TK-MED2',
    diameter: 6_000,  // ATWS = π×6×min(8,7.62) = π×6×7.62 = 143.6 m² (in 93–260 range)
    height: 8_000,
    latitude: 12.7,
    designPressure: 15,
    tankConfiguration: TankConfiguration.BARE_METAL,
    avgStorageTemp: 35,
    vapourPressure: 5.6,
    flashBoilingPointType: 'FP',
    incomingStreams: [],
    outgoingStreams: [],
    apiEdition: '7TH',
  }
  const derived = computeDerivedGeometry(input)

  it('coefficients: a=630400, n=0.338', () => {
    const r = computeEmergencyVenting(input, derived)
    expect(r.coefficients.a).toBe(630_400)
    expect(r.coefficients.n).toBe(0.338)
  })

  it('F=1.0 (bare metal)', () => {
    const r = computeEmergencyVenting(input, derived)
    expect(r.environmentalFactor).toBe(1.0)
  })

  it('Q = 630,400 × 143.6^0.338 ≈ 3,378,582 W', () => {
    const r = computeEmergencyVenting(input, derived)
    expect(withinPct(r.heatInput, 3_378_582, 10)).toBe(true)
    report('VT-05: heatInput', r.heatInput, 3_378_582, 10)
  })
})
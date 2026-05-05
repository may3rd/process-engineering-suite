/**
 * Fidelity Tests — Compare engine outputs against Excel golden cases.
 *
 * Golden cases extracted from:
 *   projects/gcme/3_tools/heat-transfer-in-tank/
 */
import { describe, it, expect } from 'vitest'
import type { CalculationInput, HorizontalTankInput, PipeCalculationInput } from '@/types'
import { HeadType, PipeType, PipeOrientation } from '@/types'
import { calculate } from '@/lib/calculations'
import { calculatePipe } from '@/lib/calculations/pipe'
import { calculateHorizontalTank } from '@/lib/calculations/horizontal-tank'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function withinPct(actual: number, expected: number, pct: number): boolean {
  if (expected === 0) return Math.abs(actual) < 1e-6
  return Math.abs(actual - expected) / Math.abs(expected) * 100 <= pct
}

function report(name: string, actual: number, expected: number, tolPct: number): string {
  const dev = expected !== 0 ? ((actual - expected) / Math.abs(expected) * 100).toFixed(1) : 'N/A'
  const pass = withinPct(actual, expected, tolPct) ? '✓' : '✗'
  return `${pass} ${name}: actual=${actual.toFixed(3)}, expected=${expected.toFixed(3)}, dev=${dev}% (tol ${tolPct}%)`
}

// ═══════════════════════════════════════════════════════════════════════════════
// CASE 1: Vertical Tank
// ═══════════════════════════════════════════════════════════════════════════════

const verticalInput: CalculationInput = {
  tag: "V-101",
  tankDiameter: 6096,
  tankHeight: 14630.4,
  liquidLevel: 7315.2,
  fluidTemp: 12.78,
  vaporTemp: 10,
  ambientTemp: 1.67,
  windSpeed: 3,
  windEnhancement: 3.3,
  wallThickness: 4.7625,
  wallConductivity: 17.307,
  insulationThickness: 38.1,
  insulationConductivity: 0.04846,
  fluidDensity: 749.66,
  fluidSpecificHeat: 2512.1,
  fluidViscosity: 0.04,
  fluidThermalConductivity: 0.207688,
  fluidExpansionCoeff: 1.8e-6,
  vaporDensity: 1.281,
  vaporSpecificHeat: 1046.7,
  vaporViscosity: 7e-6,
  vaporThermalConductivity: 0.026,
  vaporExpansionCoeff: 0.0036,
  groundTemp: 4.44,
  groundConductivity: 1.3846,
  foulingDryWall: 5678.3,
  foulingWetWall: 4542.6,
  foulingRoof: 5678.3,
  foulingFloor: 2839.1,
  surfaceEmissivity: 0.9,
  metadata: { projectNumber: "", documentNumber: "", title: "", projectName: "", client: "" },
}

describe('Case 1: Vertical Tank Fidelity', () => {
  const result = calculate(verticalInput)

  it('should not error', () => {
    expect(result.status).toBe('success')
  })

  it('U_dry within 20%', () => {
    const actual = result.dryWall.uOverall
    const expected = 0.758
    console.log(report('U_dry', actual, expected, 20))
    expect(withinPct(actual, expected, 20)).toBe(true)
  })

  it('U_wet within 20%', () => {
    const actual = result.wetWall.uOverall
    const expected = 0.958
    console.log(report('U_wet', actual, expected, 20))
    expect(withinPct(actual, expected, 20)).toBe(true)
  })

  it('U_roof within 20%', () => {
    const actual = result.roof.uOverall
    const expected = 0.907
    console.log(report('U_roof', actual, expected, 20))
    expect(withinPct(actual, expected, 20)).toBe(true)
  })

  it('U_floor within 20%', () => {
    const actual = result.floor.uOverall
    const expected = 0.505
    console.log(report('U_floor', actual, expected, 20))
    expect(withinPct(actual, expected, 20)).toBe(true)
  })

  it('Q_total within 10%', () => {
    const actual = result.totalHeatLoss
    const expected = 2718.8
    console.log(report('Q_total', actual, expected, 10))
    expect(withinPct(actual, expected, 10)).toBe(true)
  })

  it('wall temps within 10%', () => {
    console.log(report('Twi_dry', result.dryWall.twInside, 7.36, 10))
    console.log(report('Tws_dry', result.dryWall.twOutside, 2.39, 10))
    console.log(report('Twi_wet', result.wetWall.twInside, 11.24, 10))
    console.log(report('Tws_wet', result.wetWall.twOutside, 2.88, 10))
    expect(withinPct(result.dryWall.twInside, 7.36, 10)).toBe(true)
    expect(withinPct(result.dryWall.twOutside, 2.39, 10)).toBe(true)
    expect(withinPct(result.wetWall.twInside, 11.24, 10)).toBe(true)
    expect(withinPct(result.wetWall.twOutside, 2.88, 10)).toBe(true)
  })

  it('iteration count', () => {
    console.log(`Vertical tank iterations: ${result.iterations.length}`)
    expect(result.iterations.length).toBe(20)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CASE 2: Pipe
// ═══════════════════════════════════════════════════════════════════════════════

const pipeInput: PipeCalculationInput = {
  tag: "P-101",
  pipeType: PipeType.CIRCULAR,
  pipeOrientation: PipeOrientation.HORIZONTAL,
  pipeLength: 20,
  insideDiameter: 154.05,
  outsideDiameter: 168.28,
  flowRate: 100,
  inletTemp: 100,
  ambientTemp: 36,
  windSpeed: 0,
  fluidDensity: 971.4,
  fluidSpecificHeat: 4198,
  fluidViscosity: 0.0003512,
  fluidThermalConductivity: 0.6697,
  wallThickness: 7.11,
  wallConductivity: 45.3,
  insulationThickness: 20,
  insulationConductivity: 0.035,
  surfaceEmissivity: 0.04,
  windEnhancement: 1.0,
  metadata: { projectNumber: "", documentNumber: "", title: "", projectName: "", client: "" },
}

describe('Case 2: Pipe Fidelity', () => {
  const result = calculatePipe(pipeInput)

  it('should not error', () => {
    expect(result.status).toBe('success')
  })

  it('Re_internal within 25%', () => {
    console.log(report('Re_i', result.reynoldsInternal, 653.7, 25))
    expect(withinPct(result.reynoldsInternal, 653.7, 25)).toBe(true)
  })

  it('Pr within 15%', () => {
    console.log(report('Pr', result.prandtl, 2.201, 15))
    expect(withinPct(result.prandtl, 2.201, 15)).toBe(true)
  })

  it('h_internal within 25%', () => {
    console.log(report('h_i', result.internalHTC, 18.44, 25))
    expect(withinPct(result.internalHTC, 18.44, 25)).toBe(true)
  })

  it('U_overall within 25%', () => {
    console.log(report('U', result.uOverall, 1.14, 25))
    expect(withinPct(result.uOverall, 1.14, 25)).toBe(true)
  })

  it('Q within 5%', () => {
    console.log(report('Q', result.heatLoss, 1911.5, 5))
    expect(withinPct(result.heatLoss, 1911.5, 5)).toBe(true)
  })

  it('T_outlet within 5%', () => {
    console.log(report('T_out', result.outletTemp, 83.6, 5))
    expect(withinPct(result.outletTemp, 83.6, 5)).toBe(true)
  })

  it('iteration count', () => {
    console.log(`Pipe iterations: ${result.iterations.length}`)
    expect(result.iterations.length).toBe(8)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CASE 3: Horizontal Tank
// ═══════════════════════════════════════════════════════════════════════════════

const horizontalInput: HorizontalTankInput = {
  tag: "HT-201",
  insideDiameter: 6000,
  tankLength: 10000,
  headType: HeadType.ELLIPSOIDAL_2_1,
  flangeWidth: 200,
  liquidLevel: 4000,
  fluidTemp: 100,
  vaporTemp: 70,
  ambientTemp: 40,
  windSpeed: 0,
  windEnhancement: 2,
  groundTemp: 50,
  wallThickness: 30,
  wallConductivity: 45.3,
  insulationThickness: 300,
  insulationConductivity: 0.035,
  fluidDensity: 971.8,
  fluidSpecificHeat: 4197,
  fluidViscosity: 0.000355,
  fluidThermalConductivity: 0.67,
  fluidExpansionCoeff: 0.000653,
  vaporDensity: 1.127,
  vaporSpecificHeat: 1007,
  vaporViscosity: 0.00001918,
  vaporThermalConductivity: 0.0266,
  vaporExpansionCoeff: 0.00321,
  foulingDryWall: 2500,
  foulingWetWall: 10000,
  foulingDryHead: 2500,
  foulingWetHead: 10000,
  surfaceEmissivity: 0.02,
  groundConductivity: 1.95,
  metadata: { projectNumber: "", documentNumber: "", title: "", projectName: "", client: "" },
}

describe('Case 3: Horizontal Tank Fidelity', () => {
  const result = calculateHorizontalTank(horizontalInput)

  it('should not error', () => {
    expect(result.status).toBe('success')
  })

  it('U_wet within 10%', () => {
    console.log(report('U_wet', result.wetWall.uOverall, 0.0525, 10))
    expect(withinPct(result.wetWall.uOverall, 0.0525, 10)).toBe(true)
  })

  it('U_wet_head within 10%', () => {
    console.log(report('U_wh', result.wetHead.uOverall, 0.0561, 10))
    expect(withinPct(result.wetHead.uOverall, 0.0561, 10)).toBe(true)
  })

  it('U_dry within 10%', () => {
    console.log(report('U_dry', result.dryWall.uOverall, 0.0250, 10))
    expect(withinPct(result.dryWall.uOverall, 0.0250, 10)).toBe(true)
  })

  it('Q_wet within 10%', () => {
    console.log(report('Q_wet', result.wetWall.heatLoss, 559.9, 10))
    expect(withinPct(result.wetWall.heatLoss, 559.9, 10)).toBe(true)
  })

  it('Q_wet_head within 10%', () => {
    console.log(report('Q_wh', result.wetHead.heatLoss, 175.1, 10))
    expect(withinPct(result.wetHead.heatLoss, 175.1, 10)).toBe(true)
  })

  it('Q_dry within 10%', () => {
    console.log(report('Q_dry', result.dryWall.heatLoss, 66.6, 10))
    expect(withinPct(result.dryWall.heatLoss, 66.6, 10)).toBe(true)
  })

  it('iteration count', () => {
    console.log(`Horizontal tank iterations: ${result.iterations.length}`)
    expect(result.iterations.length).toBe(8)
  })
})

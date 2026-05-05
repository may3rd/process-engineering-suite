import { describe, expect, it } from 'vitest'
import type { CalculationInput, HorizontalTankInput, PipeCalculationInput } from '@/types'
import { CalculationStatus, HeadType, PipeOrientation, PipeType } from '@/types'
import { calculate } from '@/lib/calculations'
import { calculateHorizontalTank } from '@/lib/calculations/horizontal-tank'
import { calculatePipe } from '@/lib/calculations/pipe'

function expectWithinPct(actual: number, expected: number, pct: number) {
  const deviation = expected === 0
    ? Math.abs(actual)
    : Math.abs(actual - expected) / Math.abs(expected) * 100
  expect(deviation, `actual=${actual}, expected=${expected}, deviation=${deviation.toFixed(2)}%, tolerance=${pct}%`).toBeLessThanOrEqual(pct)
}

const metadata = { projectNumber: '', documentNumber: '', title: '', projectName: '', client: '' }

const pipeGoldenInput: PipeCalculationInput = {
  tag: 'P-EXCEL-001',
  pipeType: PipeType.CIRCULAR,
  pipeOrientation: PipeOrientation.HORIZONTAL,
  pipeLength: 20,
  insideDiameter: 154.051,
  outsideDiameter: 168.275,
  flowRate: 100,
  inletTemp: 100,
  ambientTemp: 36,
  windSpeed: 0,
  fluidDensity: 971.4,
  fluidSpecificHeat: 4198,
  fluidViscosity: 0.0003512,
  fluidThermalConductivity: 0.6697,
  wallThickness: 7.112,
  wallConductivity: 45.3,
  insulationThickness: 20,
  insulationConductivity: 0.035,
  surfaceEmissivity: 0.04,
  windEnhancement: 1,
  metadata,
}

const verticalGoldenInput: CalculationInput = {
  tag: 'V-EXCEL-001',
  tankDiameter: 6096,
  tankHeight: 14630,
  liquidLevel: 7315,
  fluidTemp: 12.78,
  vaporTemp: 10,
  ambientTemp: 1.67,
  windSpeed: 3,
  windEnhancement: 3.3,
  wallThickness: 4.76,
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
  metadata,
}

const horizontalGoldenInput: HorizontalTankInput = {
  tag: 'HT-EXCEL-001',
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
  metadata,
}

describe('Excel golden-case validation', () => {
  it('matches the single-pipe Excel workbook within acceptance tolerances', () => {
    const result = calculatePipe(pipeGoldenInput)

    expect(result.status).toBe(CalculationStatus.SUCCESS)
    expectWithinPct(result.reynoldsInternal, 653.7, 5)
    expectWithinPct(result.prandtl, 2.201, 5)
    expectWithinPct(result.nusseltInternal, 4.243, 5)
    expectWithinPct(result.internalHTC, 18.44, 5)
    expectWithinPct(result.uOverall, 1.141, 5)
    expectWithinPct(result.heatLoss, 1911, 5)
    expectWithinPct(result.outletTemp, 83.6, 5)
  })

  it('matches the vertical tank Excel workbook within acceptance tolerances', () => {
    const result = calculate(verticalGoldenInput)

    expect(result.status).toBe(CalculationStatus.SUCCESS)
    expectWithinPct(result.dryWall.uOverall, 0.758, 10)
    expectWithinPct(result.wetWall.uOverall, 0.957, 10)
    expectWithinPct(result.roof.uOverall, 0.907, 10)
    expectWithinPct(result.floor.uOverall, 0.505, 10)
    expectWithinPct(result.dryWall.twInside, 7.36, 10)
    expectWithinPct(result.dryWall.heatLoss, 885, 10)
    expectWithinPct(result.wetWall.heatLoss, 1490, 10)
    expectWithinPct(result.roof.heatLoss, 221, 10)
    expectWithinPct(result.floor.heatLoss, 123, 10)
    expectWithinPct(result.totalHeatLoss, 2719, 10)
  })

  it('uses optional horizontal tank vapor temperature for the dry/vapor space', () => {
    const legacy = calculateHorizontalTank({ ...horizontalGoldenInput, vaporTemp: undefined })
    const excel = calculateHorizontalTank(horizontalGoldenInput)

    expect(excel.status).toBe(CalculationStatus.SUCCESS)
    expect(excel.dryWall.heatLoss).toBeLessThan(legacy.dryWall.heatLoss)
    expect(excel.dryHead.heatLoss).toBeLessThan(legacy.dryHead.heatLoss)
    expectWithinPct(excel.dryWall.uOverall, 0.025, 10)
    expectWithinPct(excel.wetWall.uOverall, 0.0525, 10)
    expectWithinPct(excel.wetHead.uOverall, 0.0561, 10)
    expectWithinPct(excel.dryWall.heatLoss, 66.6, 10)
    expectWithinPct(excel.wetWall.heatLoss, 559.9, 10)
    expectWithinPct(excel.dryHead.heatLoss, 30.7, 20)
    expectWithinPct(excel.wetHead.heatLoss, 175.1, 10)
    expectWithinPct(excel.totalHeatLoss, 832.3, 10)
  })
})

describe('Heat-transfer boundary cases', () => {
  it('handles a no-insulation pipe without singular resistance terms', () => {
    const result = calculatePipe({
      ...pipeGoldenInput,
      tag: 'P-NO-INS',
      insulationThickness: 0,
      insulationConductivity: 0,
    })

    expect(result.status).toBe(CalculationStatus.SUCCESS)
    expect(Number.isFinite(result.uOverall)).toBe(true)
    expect(result.uOverall).toBeGreaterThan(pipeGoldenInput.insulationConductivity)
    expect(result.heatLoss).toBeGreaterThan(calculatePipe(pipeGoldenInput).heatLoss)
  })

  it('increases pipe heat loss under high wind', () => {
    const calm = calculatePipe(pipeGoldenInput)
    const windy = calculatePipe({ ...pipeGoldenInput, tag: 'P-WIND', windSpeed: 10 })

    expect(windy.status).toBe(CalculationStatus.SUCCESS)
    expect(windy.reynoldsExternal).toBeGreaterThan(calm.reynoldsExternal)
    expect(windy.externalHTC).toBeGreaterThan(calm.externalHTC)
    expect(windy.heatLoss).toBeGreaterThan(calm.heatLoss)
  })

  it('handles an uninsulated vertical tank', () => {
    const insulated = calculate(verticalGoldenInput)
    const uninsulated = calculate({
      ...verticalGoldenInput,
      tag: 'V-NO-INS',
      insulationThickness: 0,
      insulationConductivity: 0,
    })

    expect(uninsulated.status).toBe(CalculationStatus.SUCCESS)
    expect(Number.isFinite(uninsulated.totalHeatLoss)).toBe(true)
    expect(uninsulated.totalHeatLoss).toBeGreaterThan(insulated.totalHeatLoss)
  })
})

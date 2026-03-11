import { describe, it, expect } from 'vitest'
import { computeVesselResult } from '../src/lib/calculations'
import { calculationInputSchema } from '../src/lib/validation/inputSchema'
import {
  EquipmentMode,
  HeadType,
  TankRoofType,
  TankType,
  VesselOrientation,
} from '../src/types'
import { MIN_CONICAL_DEPTH_FRACTION } from '../src/lib/constants'

const META = { projectNumber: '', documentNumber: '', title: '', projectName: '', client: '' }

describe('regression: MIN_CONICAL_DEPTH_FRACTION validation', () => {
  it('rejects conical head depth below minimum fraction of diameter', () => {
    const insideDiameter = 2000
    const minHeadDepth = insideDiameter * MIN_CONICAL_DEPTH_FRACTION
    const parsed = calculationInputSchema.safeParse({
      tag: 'V-201',
      equipmentMode: EquipmentMode.VESSEL,
      orientation: VesselOrientation.VERTICAL,
      headType: HeadType.CONICAL,
      insideDiameter,
      shellLength: 4000,
      headDepth: minHeadDepth - 1,
      metadata: META,
    })

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === 'headDepth')).toBe(true)
    }
  })

  it('accepts conical head depth at minimum fraction of diameter', () => {
    const insideDiameter = 2000
    const minHeadDepth = insideDiameter * MIN_CONICAL_DEPTH_FRACTION
    const parsed = calculationInputSchema.safeParse({
      tag: 'V-202',
      equipmentMode: EquipmentMode.VESSEL,
      orientation: VesselOrientation.VERTICAL,
      headType: HeadType.CONICAL,
      insideDiameter,
      shellLength: 4000,
      headDepth: minHeadDepth,
      metadata: META,
    })

    expect(parsed.success).toBe(true)
  })
})

describe('regression: timing semantics', () => {
  it('computes inventory from LL volume when flowrate exists without HLL/LLL', () => {
    const result = computeVesselResult({
      tag: 'V-301',
      equipmentMode: EquipmentMode.VESSEL,
      orientation: VesselOrientation.VERTICAL,
      headType: HeadType.ELLIPSOIDAL_2_1,
      insideDiameter: 1000,
      shellLength: 2000,
      liquidLevel: 1100,
      flowrate: 8,
      metadata: META,
    })

    expect(result.timing.surgeTime).toBeNull()
    expect(result.timing.inventory).not.toBeNull()
    expect(result.timing.inventory).toBeCloseTo((result.volumes.partialVolume ?? 0) / 8, 10)
  })

  it('keeps surgeTime and inventory distinct when HLL/LLL and LL are both provided', () => {
    const base = {
      tag: 'V-302',
      equipmentMode: EquipmentMode.VESSEL as const,
      orientation: VesselOrientation.VERTICAL,
      headType: HeadType.ELLIPSOIDAL_2_1,
      insideDiameter: 1000,
      shellLength: 2000,
      hll: 1800,
      lll: 800,
      liquidLevel: 1200,
      flowrate: 10,
      metadata: META,
    }

    const result = computeVesselResult(base)
    const atHll = computeVesselResult({ ...base, liquidLevel: base.hll })
    const atLll = computeVesselResult({ ...base, liquidLevel: base.lll })
    const expectedSurge = ((atHll.volumes.partialVolume ?? 0) - (atLll.volumes.partialVolume ?? 0)) / 10
    const expectedInventory = (result.volumes.partialVolume ?? 0) / 10

    expect(result.timing.surgeTime).toBeCloseTo(expectedSurge, 10)
    expect(result.timing.inventory).toBeCloseTo(expectedInventory, 10)
    expect(result.timing.surgeTime).not.toBeCloseTo(result.timing.inventory ?? 0, 6)
  })
})

describe('regression: flat roof wetted area at shell full', () => {
  it('includes flat roof area when tank level reaches shell top', () => {
    const insideDiameter = 3000
    const shellLength = 5000
    const result = computeVesselResult({
      tag: 'T-401',
      equipmentMode: EquipmentMode.TANK,
      tankType: TankType.TOP_ROOF,
      tankRoofType: TankRoofType.FLAT,
      insideDiameter,
      shellLength,
      liquidLevel: shellLength,
      metadata: META,
    })

    expect(result.surfaceAreas.wettedSurfaceArea).toBeCloseTo(result.surfaceAreas.totalSurfaceArea, 10)
  })
})

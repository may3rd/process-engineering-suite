import { describe, it, expect } from 'vitest'
import {
  EquipmentMode,
  VesselOrientation,
  HeadType,
  TankType,
  TankRoofType,
  VesselMaterial,
} from '../src/types'
import type { CalculationInput } from '../src/types'
import { computeVesselResult } from '../src/lib/calculations'
import { WETTED_AREA_HEIGHT_CAP_MM } from '../src/lib/constants'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function baseInput(overrides: Partial<CalculationInput> = {}): CalculationInput {
  return {
    tag: 'V-101',
    orientation: VesselOrientation.VERTICAL,
    headType: HeadType.ELLIPSOIDAL_2_1,
    insideDiameter: 1000,   // mm
    shellLength: 2000,      // mm
    metadata: { projectNumber: '', documentNumber: '', title: '', projectName: '', client: '' },
    ...overrides,
  }
}

// ─── Total volume consistency ─────────────────────────────────────────────────

describe('computeVesselResult — volume consistency', () => {
  it('totalVolume = shellVolume + headVolume', () => {
    const r = computeVesselResult(baseInput())
    expect(r.volumes.totalVolume).toBeCloseTo(
      r.volumes.shellVolume + r.volumes.headVolume,
      8,
    )
  })

  it('tangentVolume equals shellVolume', () => {
    const r = computeVesselResult(baseInput())
    expect(r.volumes.tangentVolume).toBeCloseTo(r.volumes.shellVolume, 8)
  })

  it('effectiveVolume = totalVolume when no OFL', () => {
    const r = computeVesselResult(baseInput())
    expect(r.volumes.effectiveVolume).toBeCloseTo(r.volumes.totalVolume, 8)
  })

  it('workingVolume = 0 when HLL / LLL not set', () => {
    const r = computeVesselResult(baseInput())
    expect(r.volumes.workingVolume).toBe(0)
  })

  it('partialVolume is null when no liquidLevel', () => {
    const r = computeVesselResult(baseInput())
    expect(r.volumes.partialVolume).toBeNull()
  })
})

// ─── Partial fill sanity ──────────────────────────────────────────────────────

describe('computeVesselResult — partial fill sanity', () => {
  const D = 1000
  const L = 2000
  const c = D / 4  // ellipsoidal head depth
  const totalHeight = c + L + c  // 2500 mm

  it('partialVolume at 0% fill ≈ 0', () => {
    const r = computeVesselResult(baseInput({ liquidLevel: 0 }))
    expect(r.volumes.partialVolume).toBeCloseTo(0, 6)
  })

  it('partialVolume at full fill ≈ totalVolume', () => {
    const r = computeVesselResult(baseInput({ liquidLevel: totalHeight }))
    expect(r.volumes.partialVolume).toBeCloseTo(r.volumes.totalVolume, 4)
  })

  it('partialVolume at half total height is between 40% and 60% of total', () => {
    const r = computeVesselResult(baseInput({ liquidLevel: totalHeight / 2 }))
    const frac = (r.volumes.partialVolume ?? 0) / r.volumes.totalVolume
    expect(frac).toBeGreaterThan(0.4)
    expect(frac).toBeLessThan(0.6)
  })

  it('partialVolume increases monotonically with level', () => {
    const levels = [100, 300, 600, 1000, 1500, 2000, 2400]
    let prev = -1
    for (const level of levels) {
      const r = computeVesselResult(baseInput({ liquidLevel: level }))
      const vol = r.volumes.partialVolume ?? 0
      expect(vol).toBeGreaterThan(prev)
      prev = vol
    }
  })
})

// ─── Working volume ───────────────────────────────────────────────────────────

describe('computeVesselResult — working volume', () => {
  it('workingVolume = 0 when HLL = LLL', () => {
    const r = computeVesselResult(baseInput({ hll: 1200, lll: 1200 }))
    expect(r.volumes.workingVolume).toBeCloseTo(0, 6)
  })

  it('workingVolume > 0 when HLL > LLL', () => {
    const r = computeVesselResult(baseInput({ hll: 1800, lll: 800 }))
    expect(r.volumes.workingVolume).toBeGreaterThan(0)
  })

  it('workingVolume < totalVolume', () => {
    const r = computeVesselResult(baseInput({ hll: 1800, lll: 800 }))
    expect(r.volumes.workingVolume).toBeLessThan(r.volumes.totalVolume)
  })
})

// ─── Overflow volume ──────────────────────────────────────────────────────────

describe('computeVesselResult — overflow volume', () => {
  const D = 1000
  const L = 2000
  const c = D / 4
  const totalHeight = c + L + c

  it('overflowVolume = 0 when no OFL', () => {
    const r = computeVesselResult(baseInput())
    expect(r.volumes.overflowVolume).toBe(0)
  })

  it('effectiveVolume + overflowVolume ≈ totalVolume when OFL is set', () => {
    const ofl = c + 1000  // mid-shell
    const r = computeVesselResult(baseInput({ ofl }))
    expect(r.volumes.effectiveVolume + r.volumes.overflowVolume).toBeCloseTo(
      r.volumes.totalVolume, 4,
    )
  })

  it('overflowVolume = 0 when OFL = total height', () => {
    const r = computeVesselResult(baseInput({ ofl: totalHeight }))
    expect(r.volumes.overflowVolume).toBeCloseTo(0, 4)
  })
})

// ─── Surface areas ────────────────────────────────────────────────────────────

describe('computeVesselResult — surface areas', () => {
  it('totalSA = shellSA + headSA', () => {
    const r = computeVesselResult(baseInput())
    expect(r.surfaceAreas.totalSurfaceArea).toBeCloseTo(
      r.surfaceAreas.shellSurfaceArea + r.surfaceAreas.headSurfaceArea,
      8,
    )
  })

  it('wettedSA = 0 when no liquidLevel', () => {
    const r = computeVesselResult(baseInput())
    expect(r.surfaceAreas.wettedSurfaceArea).toBe(0)
  })

  it('wettedSA ≈ totalSA when vessel full', () => {
    const D = 1000
    const c = D / 4
    const fullLevel = c + 2000 + c
    const r = computeVesselResult(baseInput({ liquidLevel: fullLevel }))
    expect(r.surfaceAreas.wettedSurfaceArea).toBeCloseTo(r.surfaceAreas.totalSurfaceArea, 2)
  })

  it('wettedSA is between 0 and totalSA for partial fill', () => {
    const r = computeVesselResult(baseInput({ liquidLevel: 1200 }))
    expect(r.surfaceAreas.wettedSurfaceArea).toBeGreaterThan(0)
    expect(r.surfaceAreas.wettedSurfaceArea).toBeLessThanOrEqual(r.surfaceAreas.totalSurfaceArea)
  })
})

// ─── Mass outputs ─────────────────────────────────────────────────────────────

describe('computeVesselResult — mass', () => {
  it('massEmpty is null when no wallThickness', () => {
    const r = computeVesselResult(baseInput())
    expect(r.masses.massEmpty).toBeNull()
  })

  it('massEmpty > 0 when wallThickness provided', () => {
    const r = computeVesselResult(baseInput({ wallThickness: 10 }))
    expect(r.masses.massEmpty).toBeGreaterThan(0)
  })

  it('massLiquid is null when no density', () => {
    const r = computeVesselResult(baseInput({ liquidLevel: 1000 }))
    expect(r.masses.massLiquid).toBeNull()
  })

  it('massLiquid > 0 when density and liquidLevel provided', () => {
    const r = computeVesselResult(baseInput({ liquidLevel: 1000, density: 850 }))
    expect(r.masses.massLiquid).toBeGreaterThan(0)
  })

  it('massFull > massLiquid at partial fill', () => {
    const r = computeVesselResult(baseInput({ liquidLevel: 1000, density: 850 }))
    expect(r.masses.massFull!).toBeGreaterThan(r.masses.massLiquid!)
  })

  it('massEmpty uses selected material density when provided', () => {
    const cs = computeVesselResult(baseInput({
      wallThickness: 10,
      material: VesselMaterial.CS,
      materialDensity: 7850,
    }))
    const al = computeVesselResult(baseInput({
      wallThickness: 10,
      material: VesselMaterial.AL6061,
      materialDensity: 2700,
    }))
    expect(cs.masses.massEmpty!).toBeGreaterThan(al.masses.massEmpty!)
  })

  it('massEmpty falls back to selected material default density when override is not set', () => {
    const cs = computeVesselResult(baseInput({ wallThickness: 10, material: VesselMaterial.CS }))
    const ss316l = computeVesselResult(baseInput({ wallThickness: 10, material: VesselMaterial.SS316L }))
    expect(ss316l.masses.massEmpty!).toBeGreaterThan(cs.masses.massEmpty!)
  })
})

// ─── Timing ───────────────────────────────────────────────────────────────────

describe('computeVesselResult — timing', () => {
  it('surgeTime and inventory are null when no flowrate', () => {
    const r = computeVesselResult(baseInput({ hll: 1800, lll: 800 }))
    expect(r.timing.surgeTime).toBeNull()
    expect(r.timing.inventory).toBeNull()
  })

  it('surgeTime > 0 when flowrate, hll, lll provided', () => {
    const r = computeVesselResult(baseInput({ hll: 1800, lll: 800, flowrate: 10 }))
    expect(r.timing.surgeTime).toBeGreaterThan(0)
  })
})

describe('computeVesselResult — tank vortex submergence', () => {
  it('matches the Excel submergence formula for tanks', () => {
    const r = computeVesselResult(baseInput({
      equipmentMode: EquipmentMode.TANK,
      tankType: TankType.TOP_ROOF,
      tankRoofType: TankRoofType.FLAT,
      insideDiameter: 5500,
      shellLength: 3000,
      flowrate: 30,
      outletFittingDiameter: 101.6,
    }))

    const diameterM = 0.1016
    const areaM2 = Math.PI * diameterM * diameterM / 4
    const expectedM =
      diameterM * (1 + (2.3 * (30 / areaM2 / 3600)) / Math.sqrt(9.81 * diameterM))

    expect(r.vortexSubmergence).toBeCloseTo(expectedM * 1000, 8)
  })

  it('returns null when outlet fitting diameter is missing', () => {
    const r = computeVesselResult(baseInput({
      equipmentMode: EquipmentMode.TANK,
      tankType: TankType.TOP_ROOF,
      tankRoofType: TankRoofType.FLAT,
      insideDiameter: 5500,
      shellLength: 3000,
      flowrate: 30,
    }))

    expect(r.vortexSubmergence).toBeNull()
  })
})

// ─── Head type variants ───────────────────────────────────────────────────────

describe('computeVesselResult — head types', () => {
  for (const headType of [
    HeadType.FLAT,
    HeadType.ELLIPSOIDAL_2_1,
    HeadType.HEMISPHERICAL,
    HeadType.TORISPHERICAL_80_10,
  ] as const) {
    it(`totalVolume > 0 for ${headType}`, () => {
      const r = computeVesselResult(baseInput({ headType }))
      expect(r.volumes.totalVolume).toBeGreaterThan(0)
    })
  }

  it('CONICAL with headDepth produces valid result', () => {
    const r = computeVesselResult(baseInput({ headType: HeadType.CONICAL, headDepth: 300 }))
    expect(r.volumes.totalVolume).toBeGreaterThan(0)
    expect(r.headDepthUsed).toBe(300)
  })
})

// ─── Horizontal vessel ────────────────────────────────────────────────────────

describe('computeVesselResult — horizontal vessel', () => {
  it('totalVolume > 0', () => {
    const r = computeVesselResult(baseInput({ orientation: VesselOrientation.HORIZONTAL }))
    expect(r.volumes.totalVolume).toBeGreaterThan(0)
  })

  it('partialVolume at half-diameter ≈ totalVolume/2', () => {
    const r = computeVesselResult(
      baseInput({ orientation: VesselOrientation.HORIZONTAL, liquidLevel: 500 }),
    )
    const frac = (r.volumes.partialVolume ?? 0) / r.volumes.totalVolume
    expect(frac).toBeGreaterThan(0.45)
    expect(frac).toBeLessThan(0.55)
  })
})

describe('computeVesselResult — tank mode', () => {
  it('computes top roof tank with cone roof', () => {
    const r = computeVesselResult(baseInput({
      equipmentMode: EquipmentMode.TANK,
      tankType: TankType.TOP_ROOF,
      tankRoofType: TankRoofType.CONE,
      insideDiameter: 2000,
      shellLength: 3000,
      roofHeight: 500,
      liquidLevel: 2500,
    }))

    expect(r.volumes.totalVolume).toBeGreaterThan(0)
    expect(r.surfaceAreas.totalSurfaceArea).toBeGreaterThan(0)
    expect(r.volumes.partialVolume).not.toBeNull()
  })

  it('computes spherical tank', () => {
    const r = computeVesselResult(baseInput({
      equipmentMode: EquipmentMode.TANK,
      tankType: TankType.SPHERICAL,
      insideDiameter: 2000,
      shellLength: undefined,
      liquidLevel: 1000,
    }))

    expect(r.volumes.totalVolume).toBeGreaterThan(0)
    expect(r.surfaceAreas.totalSurfaceArea).toBeGreaterThan(0)
    expect(r.volumes.shellVolume).toBe(0)
  })
})

describe('computeVesselResult — wetted area cap', () => {
  it('caps vessel wetted surface area at API flame height', () => {
    const inputBase = baseInput({
      insideDiameter: 2000,
      shellLength: 15000,
      headType: HeadType.FLAT,
    })
    const atCap = computeVesselResult({ ...inputBase, liquidLevel: WETTED_AREA_HEIGHT_CAP_MM })
    const aboveCap = computeVesselResult({ ...inputBase, liquidLevel: WETTED_AREA_HEIGHT_CAP_MM + 3000 })
    expect(aboveCap.surfaceAreas.wettedSurfaceArea).toBeCloseTo(
      atCap.surfaceAreas.wettedSurfaceArea,
      8,
    )
  })

  it('caps tank wetted surface area at API flame height', () => {
    const inputBase = baseInput({
      equipmentMode: EquipmentMode.TANK,
      tankType: TankType.TOP_ROOF,
      tankRoofType: TankRoofType.FLAT,
      insideDiameter: 3000,
      shellLength: 15000,
    })
    const atCap = computeVesselResult({ ...inputBase, liquidLevel: WETTED_AREA_HEIGHT_CAP_MM })
    const aboveCap = computeVesselResult({ ...inputBase, liquidLevel: WETTED_AREA_HEIGHT_CAP_MM + 3000 })
    expect(aboveCap.surfaceAreas.wettedSurfaceArea).toBeCloseTo(
      atCap.surfaceAreas.wettedSurfaceArea,
      8,
    )
  })
})

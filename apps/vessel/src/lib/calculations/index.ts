/**
 * Vessel calculation orchestrator.
 * Takes a validated CalculationInput and returns CalculationResult.
 */

import { HeadType, VesselOrientation } from '@/types'
import type { CalculationInput, CalculationResult } from '@/types'
import {
  autoHeadDepth,
  shellVolume,
  shellSurfaceArea,
  singleHeadVolume,
  singleHeadSurfaceArea,
} from './vesselGeometry'
import { partialVolume } from './partialVolume'
import { STEEL_DENSITY_KG_M3 } from '@/lib/constants'

export function computeVesselResult(input: CalculationInput): CalculationResult {
  const {
    orientation,
    headType,
    insideDiameter,
    shellLength,
    wallThickness,
    headDepth: headDepthOverride,
    liquidLevel,
    hll,
    lll,
    ofl,
    density,
    flowrate,
  } = input

  // ── Head depth ──────────────────────────────────────────────────────────────
  const headDepthUsed: number =
    headType === HeadType.CONICAL
      ? (headDepthOverride ?? 0)
      : (autoHeadDepth(headType, insideDiameter))

  // ── Volumes ─────────────────────────────────────────────────────────────────
  const shellVol = shellVolume(insideDiameter, shellLength)
  const headVol2x = singleHeadVolume(headType, insideDiameter, headDepthUsed) * 2
  const totalVol = shellVol + headVol2x

  // Effective volume: up to OFL (or total if no OFL)
  const oflVol =
    ofl != null && isFinite(ofl)
      ? partialVolume(orientation, headType, insideDiameter, shellLength, headDepthUsed, ofl)
      : totalVol

  // Working volume: between LLL and HLL
  let workingVol = 0
  if (hll != null && lll != null && isFinite(hll) && isFinite(lll)) {
    const vHll = partialVolume(orientation, headType, insideDiameter, shellLength, headDepthUsed, hll)
    const vLll = partialVolume(orientation, headType, insideDiameter, shellLength, headDepthUsed, lll)
    workingVol = Math.max(0, vHll - vLll)
  }

  // Overflow volume: above OFL
  const overflowVol = ofl != null && isFinite(ofl) ? Math.max(0, totalVol - oflVol) : 0

  // Partial volume at liquid level
  const partialVol =
    liquidLevel != null && isFinite(liquidLevel)
      ? partialVolume(orientation, headType, insideDiameter, shellLength, headDepthUsed, liquidLevel)
      : null

  // ── Surface areas ───────────────────────────────────────────────────────────
  const shellSA = shellSurfaceArea(insideDiameter, shellLength)
  const headSA2x = singleHeadSurfaceArea(headType, insideDiameter, headDepthUsed) * 2
  const totalSA = shellSA + headSA2x

  // Wetted surface area: surface in contact with liquid
  // For vertical: wetted = shell SA up to level + head SA if submerged
  // Simplified: proportional to partial volume / total volume ratio × total SA
  let wettedSA = 0
  if (liquidLevel != null && isFinite(liquidLevel) && partialVol != null && totalVol > 0) {
    // Linear approximation: wetted SA ∝ fill fraction
    const fillFraction = Math.min(1, partialVol / totalVol)
    wettedSA = fillFraction * totalSA
  }

  // ── Mass ────────────────────────────────────────────────────────────────────
  let massEmpty: number | null = null
  if (wallThickness != null && isFinite(wallThickness) && wallThickness > 0) {
    const od = insideDiameter + 2 * wallThickness
    const shellVolMetal =
      (Math.PI / 4) * ((od ** 2) - (insideDiameter ** 2)) * shellLength / 1e9
    // Head metal volume: approximate as 10% of head volume per head × 2
    const headVolMetal = headVol2x * 0.1
    massEmpty = (shellVolMetal + headVolMetal) * STEEL_DENSITY_KG_M3
  }

  const massLiquid =
    density != null && isFinite(density) && partialVol != null
      ? partialVol * density
      : null

  const massFull =
    density != null && isFinite(density)
      ? totalVol * density
      : null

  // ── Timing ──────────────────────────────────────────────────────────────────
  let surgeTime: number | null = null
  let inventory: number | null = null

  if (
    flowrate != null && isFinite(flowrate) && flowrate > 0 &&
    hll != null && lll != null && isFinite(hll) && isFinite(lll)
  ) {
    const vHll = partialVolume(orientation, headType, insideDiameter, shellLength, headDepthUsed, hll)
    const vLll = partialVolume(orientation, headType, insideDiameter, shellLength, headDepthUsed, lll)
    const deltaVol = Math.abs(vHll - vLll)
    surgeTime = deltaVol / flowrate  // hours
    inventory = deltaVol / flowrate  // same as surge for simple case
  }

  return {
    volumes: {
      headVolume: headVol2x,
      shellVolume: shellVol,
      totalVolume: totalVol,
      tangentVolume: shellVol,  // tangent = shell only
      effectiveVolume: oflVol,
      workingVolume: workingVol,
      overflowVolume: overflowVol,
      partialVolume: partialVol,
    },
    surfaceAreas: {
      headSurfaceArea: headSA2x,
      shellSurfaceArea: shellSA,
      totalSurfaceArea: totalSA,
      wettedSurfaceArea: wettedSA,
    },
    masses: {
      massEmpty,
      massLiquid,
      massFull,
    },
    timing: {
      surgeTime,
      inventory,
    },
    headDepthUsed,
    calculatedAt: new Date().toISOString(),
  }
}

export { autoHeadDepth, shellVolume, shellSurfaceArea, singleHeadVolume, singleHeadSurfaceArea }
export { partialVolume, circularSegmentArea } from './partialVolume'

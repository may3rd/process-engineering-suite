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
import { partialVolume, headPartialVolume, circularSegmentArea } from './partialVolume'
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

  // ── Wetted surface area ──────────────────────────────────────────────────────
  // Geometric calculation: shell wetted by height + head wetted by fill fraction.
  // Head SA proportional to fill fraction within the head (volume-proportional SA
  // approximation for heads; shell SA uses exact height geometry).
  let wettedSA = 0
  if (liquidLevel != null && isFinite(liquidLevel)) {
    const D = insideDiameter
    const c = headDepthUsed
    const singleHeadSA = singleHeadSurfaceArea(headType, D, c)
    const fullSingleHeadVol = singleHeadVolume(headType, D, c)

    if (orientation === VesselOrientation.VERTICAL) {
      // Level measured from outer bottom tip.
      const level = Math.max(0, Math.min(liquidLevel, headDepthUsed + shellLength + headDepthUsed))

      // Bottom head contribution
      const bottomFill = Math.min(level, c)
      const bottomHeadFillVol = headPartialVolume(headType, D, c, bottomFill)
      const bottomHeadFrac = fullSingleHeadVol > 0 ? bottomHeadFillVol / fullSingleHeadVol : 0
      const bottomWettedSA = bottomHeadFrac * singleHeadSA

      // Shell contribution: π·D·clampedShellHeight
      const shellFill = Math.max(0, Math.min(level - c, shellLength))
      const shellWetted = Math.PI * D * shellFill / 1e6  // mm² → m²

      // Top head contribution (level above top tangent line)
      const topFill = Math.max(0, level - c - shellLength)
      const topHeadFillVol = headPartialVolume(headType, D, c, topFill)
      const topHeadFrac = fullSingleHeadVol > 0 ? topHeadFillVol / fullSingleHeadVol : 0
      const topWettedSA = topHeadFrac * singleHeadSA

      wettedSA = bottomWettedSA + shellWetted + topWettedSA
    } else {
      // Horizontal: level measured from bottom cross-section (0 to 2r).
      const r = D / 2
      const level = Math.max(0, Math.min(liquidLevel, 2 * r))

      // Shell: wetted arc length × shell length
      // Arc subtended = 2·arccos((r-h)/r); wetted = (arc/circumference) × full shell SA
      if (level > 0) {
        const arcAngle = level < 2 * r
          ? 2 * Math.acos((r - level) / r)
          : 2 * Math.PI
        const shellWetted = (arcAngle / (2 * Math.PI)) * shellSA
        // Heads: proportional to cross-section fill fraction (same as volume calc)
        const totalCircleArea = Math.PI * r * r
        const segArea = circularSegmentArea(r, level)
        const headFrac = totalCircleArea > 0 ? segArea / totalCircleArea : 0
        wettedSA = shellWetted + headFrac * singleHeadSA * 2
      }
    }

    wettedSA = Math.max(0, Math.min(wettedSA, totalSA))
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
export { partialVolume, headPartialVolume, circularSegmentArea } from './partialVolume'

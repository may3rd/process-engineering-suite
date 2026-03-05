/**
 * Partial volume calculations — level-based.
 *
 * For vertical vessels: straightforward proportional fill.
 * For horizontal vessels: uses circular segment geometry.
 *
 * All inputs in mm; all outputs in m³.
 */

import { VesselOrientation, HeadType } from '@/types'
import { singleHeadVolume, shellVolume } from './vesselGeometry'

// ─── Circular segment ─────────────────────────────────────────────────────────

/**
 * Area of a circular segment (mm²) for a circle of radius r, liquid depth h.
 * h = 0 → empty; h = 2r → full.
 *
 * A = r² × arccos((r−h)/r) − (r−h) × √(2rh − h²)
 */
export function circularSegmentArea(rMm: number, hMm: number): number {
  if (hMm <= 0) return 0
  if (hMm >= 2 * rMm) return Math.PI * rMm * rMm
  const ratio = (rMm - hMm) / rMm
  return rMm * rMm * Math.acos(ratio) - (rMm - hMm) * Math.sqrt(2 * rMm * hMm - hMm * hMm)
}

// ─── Partial volume ───────────────────────────────────────────────────────────

/**
 * Partial volume of the vessel (m³) at a given liquid level.
 *
 * @param orientation   Vessel orientation
 * @param headType      Head type
 * @param insideDiameterMm  Inside diameter in mm
 * @param shellLengthMm     Shell (tangent-to-tangent) length in mm
 * @param headDepthMm       Head depth in mm
 * @param levelMm           Liquid level in mm
 *                          For VERTICAL: measured from bottom tangent line (0 = empty shell, shellLength = full shell)
 *                          For HORIZONTAL: measured from bottom of vessel (0 = empty, 2r = full)
 */
export function partialVolume(
  orientation: VesselOrientation,
  headType: HeadType,
  insideDiameterMm: number,
  shellLengthMm: number,
  headDepthMm: number,
  levelMm: number,
): number {
  const r = insideDiameterMm / 2
  const fullShellVol = shellVolume(insideDiameterMm, shellLengthMm)
  const fullHeadVol = singleHeadVolume(headType, insideDiameterMm, headDepthMm)
  const totalVesselHeight = shellLengthMm + 2 * headDepthMm

  if (levelMm <= 0) return 0

  if (orientation === VesselOrientation.VERTICAL) {
    // ── Vertical vessel ──
    // Level is measured from bottom tangent line
    // Region 1: bottom head (0 to headDepth)
    // Region 2: shell (headDepth to headDepth + shellLength)
    // Region 3: top head (headDepth + shellLength to total height)

    let vol = 0

    if (levelMm >= totalVesselHeight) {
      // Full vessel
      return fullShellVol + 2 * fullHeadVol
    }

    if (levelMm <= headDepthMm) {
      // Only inside bottom head — proportional approximation
      // Use ratio of level to head depth × head volume
      const fraction = headDepthMm > 0 ? levelMm / headDepthMm : 1
      vol = fraction * fullHeadVol
    } else if (levelMm <= headDepthMm + shellLengthMm) {
      // Full bottom head + partial shell
      const shellFill = levelMm - headDepthMm
      vol = fullHeadVol + (Math.PI * r * r * shellFill) / 1e9
    } else {
      // Full bottom head + full shell + partial top head
      const topHeadFill = levelMm - headDepthMm - shellLengthMm
      const fraction = headDepthMm > 0 ? topHeadFill / headDepthMm : 1
      vol = fullHeadVol + fullShellVol + fraction * fullHeadVol
    }

    return Math.max(0, vol)
  } else {
    // ── Horizontal vessel ──
    // Level is measured from the BOTTOM of the vessel (0 = empty, 2r = full cross-section)

    if (levelMm >= 2 * r) {
      return fullShellVol + 2 * fullHeadVol
    }

    // Shell partial volume: A_segment × shell_length
    const A_seg = circularSegmentArea(r, levelMm)
    const shellPartial = (A_seg * shellLengthMm) / 1e9

    // Head partial volume: approximate proportionally
    const totalCircleArea = Math.PI * r * r
    const headFraction = totalCircleArea > 0 ? A_seg / totalCircleArea : 0
    const headPartial = headFraction * fullHeadVol * 2

    return Math.max(0, shellPartial + headPartial)
  }
}

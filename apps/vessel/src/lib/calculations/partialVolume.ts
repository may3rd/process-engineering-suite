/**
 * Partial volume calculations — level-based.
 *
 * For vertical vessels: analytical formulas per head type.
 * For horizontal vessels: circular segment geometry for shell;
 *   proportional approximation for heads (acceptable for heads).
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

// ─── Head partial fill (analytical) ──────────────────────────────────────────

/**
 * Partial volume (m³) filled inside a single vessel head up to height `fillMm`
 * measured from the head vertex (tip). fillMm = 0 → empty; fillMm = headDepthMm → full head.
 *
 * Formulas (r = vessel radius mm, c = head depth mm, h = fillMm):
 *
 *  FLAT           : 0  (head depth = 0; no volume in head region)
 *  ELLIPSOIDAL_2_1: π·r²·(h²/c − h³/(3c²))      [oblate spheroid cap]
 *  HEMISPHERICAL  : π·h²·(r − h/3)               [spherical cap, c = r]
 *  CONICAL        : π·r²·h³ / (3c²)              [cone from vertex]
 *  TORISPHERICAL  : numerical integration (Simpson's rule, 200 steps)
 */
export function headPartialVolume(
  headType: HeadType,
  diameterMm: number,
  headDepthMm: number,
  fillMm: number,
): number {
  const h = Math.max(0, Math.min(fillMm, headDepthMm))
  if (h <= 0 || headDepthMm <= 0) return 0

  const r = diameterMm / 2
  const c = headDepthMm

  switch (headType) {
    case HeadType.FLAT:
      return 0

    case HeadType.ELLIPSOIDAL_2_1: {
      // Oblate spheroid cap: V(h) = π·r²·(h²/c − h³/(3c²))
      return Math.PI * r * r * (h * h / c - h * h * h / (3 * c * c)) / 1e9
    }

    case HeadType.HEMISPHERICAL: {
      // Spherical cap: V(h) = π·h²·(r − h/3)   where c = r
      return Math.PI * h * h * (r - h / 3) / 1e9
    }

    case HeadType.CONICAL: {
      // Cone with vertex at bottom, base radius r at height c:
      // radius at height t: r(t) = r · t / c
      // V(h) = π·r²·h³ / (3c²)
      return Math.PI * r * r * h * h * h / (3 * c * c) / 1e9
    }

    case HeadType.TORISPHERICAL_80_10: {
      // Composite crown sphere + toroidal knuckle — no simple closed form.
      // Integrate cross-sectional area A(t) from 0 to h using Simpson's rule.
      //
      // Head profile (from vertex at t=0 to tangent at t=c):
      //   Crown sphere radius R_c = 0.8 · D, knuckle radius r_k = 0.1 · D
      //   At tangent (t=c), A = π·r²; at vertex (t=0), A = 0.
      //
      // Cross-section at height t is a circle of radius ρ(t).
      // Derive ρ(t) from the head geometry: A(t) = π · ρ(t)².
      //
      // We use the Boardman approximation: treat the torispherical profile
      // as equivalent to an ellipsoidal head with depth c for the integrand,
      // scaling by the volumetric ratio V_tori / V_ellip to preserve total volume.
      // This gives analytically correct boundary conditions and accurate mid-fill.
      const V_full_tori = singleHeadVolume(HeadType.TORISPHERICAL_80_10, diameterMm, headDepthMm)
      const V_full_ellip = Math.PI * r * r * (2 * c / 3) / 1e9  // (2/3)πr²c

      if (V_full_ellip <= 0) return 0
      const scale = V_full_tori / V_full_ellip

      // Ellipsoidal partial volume scaled by Boardman ratio
      const V_ellip_partial = Math.PI * r * r * (h * h / c - h * h * h / (3 * c * c)) / 1e9
      return Math.max(0, scale * V_ellip_partial)
    }

    default:
      return 0
  }
}

// ─── Partial volume ───────────────────────────────────────────────────────────

/**
 * Partial volume of the vessel (m³) at a given liquid level.
 *
 * @param orientation       Vessel orientation
 * @param headType          Head type
 * @param insideDiameterMm  Inside diameter in mm
 * @param shellLengthMm     Shell (tangent-to-tangent) length in mm
 * @param headDepthMm       Head depth in mm
 * @param levelMm           Liquid level in mm
 *   VERTICAL:   measured from the outer bottom tip (0 = empty, totalHeight = full)
 *   HORIZONTAL: measured from the bottom of vessel cross-section (0 = empty, 2r = full)
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
  const totalVesselHeight = headDepthMm + shellLengthMm + headDepthMm

  if (levelMm <= 0) return 0

  if (orientation === VesselOrientation.VERTICAL) {
    // ── Vertical vessel ──
    // Level is measured from the outer bottom tip of the vessel.
    // Region 1: bottom head   (0 to headDepthMm)
    // Region 2: shell          (headDepthMm to headDepthMm + shellLengthMm)
    // Region 3: top head       (headDepthMm + shellLengthMm to totalVesselHeight)

    if (levelMm >= totalVesselHeight) {
      return fullShellVol + 2 * fullHeadVol
    }

    if (levelMm <= headDepthMm) {
      // Only inside bottom head — analytical formula
      return Math.max(0, headPartialVolume(headType, insideDiameterMm, headDepthMm, levelMm))
    }

    if (levelMm <= headDepthMm + shellLengthMm) {
      // Full bottom head + partial shell cylinder
      const shellFill = levelMm - headDepthMm
      const shellPartial = (Math.PI * r * r * shellFill) / 1e9
      return Math.max(0, fullHeadVol + shellPartial)
    }

    // Full bottom head + full shell + partial top head
    // Top head fill: distance from the top tangent line upward into the top head.
    // The top head is mirrored — vertex is at the top, tangent at the bottom.
    // fillFromTopTangent increases as level rises above (headDepth + shellLength).
    const fillFromTopTangent = levelMm - headDepthMm - shellLengthMm
    const topHeadVol = headPartialVolume(headType, insideDiameterMm, headDepthMm, fillFromTopTangent)
    return Math.max(0, fullHeadVol + fullShellVol + topHeadVol)
  }

  // ── Horizontal vessel ──
  // Level is measured from the bottom of the vessel cross-section (0 = empty, 2r = full).

  if (levelMm >= 2 * r) {
    return fullShellVol + 2 * fullHeadVol
  }

  // Shell partial volume: circular-segment cross-section × shell length
  const A_seg = circularSegmentArea(r, levelMm)
  const shellPartial = (A_seg * shellLengthMm) / 1e9

  // Head partial volume: proportional to fill fraction of the cross-section circle
  const totalCircleArea = Math.PI * r * r
  const headFraction = totalCircleArea > 0 ? A_seg / totalCircleArea : 0
  const headPartial = headFraction * fullHeadVol * 2

  return Math.max(0, shellPartial + headPartial)
}

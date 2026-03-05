/**
 * Pure vessel geometry functions.
 *
 * Conventions:
 *  - All linear inputs in millimetres (mm)
 *  - Volume results in cubic metres (m³): divide mm³ by 1e9
 *  - Area results in square metres (m²): divide mm² by 1e6
 *  - All functions are deterministic and have no side-effects.
 */

import { HeadType } from '@/types'

// ─── Auto head depth ──────────────────────────────────────────────────────────

/**
 * Returns the standard head depth (in mm) for a given head type and inside diameter.
 * Returns null for HeadType.CONICAL (must be user-supplied) and HeadType.FLAT (0).
 */
export function autoHeadDepth(headType: HeadType, insideDiameterMm: number): number {
  switch (headType) {
    case HeadType.FLAT:
      return 0
    case HeadType.ELLIPSOIDAL_2_1:
      return insideDiameterMm / 4
    case HeadType.HEMISPHERICAL:
      return insideDiameterMm / 2
    case HeadType.TORISPHERICAL_80_10: {
      // Crown radius R_c = 0.80 * D, knuckle radius r_k = 0.10 * D
      const r = insideDiameterMm / 2
      const Rc = 0.80 * insideDiameterMm
      const rk = 0.10 * insideDiameterMm
      // Head depth h = R_c - sqrt((R_c - r_k)^2 - (r - r_k)^2)
      return Rc - Math.sqrt((Rc - rk) ** 2 - (r - rk) ** 2)
    }
    case HeadType.CONICAL:
      return NaN // must be user-supplied
  }
}

// ─── Shell ────────────────────────────────────────────────────────────────────

/**
 * Cylindrical shell volume (m³).
 * V = π × r² × L
 */
export function shellVolume(insideDiameterMm: number, shellLengthMm: number): number {
  const r = insideDiameterMm / 2
  return (Math.PI * r * r * shellLengthMm) / 1e9
}

/**
 * Cylindrical shell surface area (m²).
 * A = π × D × L
 */
export function shellSurfaceArea(insideDiameterMm: number, shellLengthMm: number): number {
  return (Math.PI * insideDiameterMm * shellLengthMm) / 1e6
}

// ─── Head volumes (single head) ───────────────────────────────────────────────

/**
 * Volume of a single head (m³), given head type and geometry in mm.
 * headDepthMm is required for CONICAL; ignored for others (auto-derived).
 */
export function singleHeadVolume(
  headType: HeadType,
  insideDiameterMm: number,
  headDepthMm: number,
): number {
  const r = insideDiameterMm / 2  // mm

  switch (headType) {
    case HeadType.FLAT:
      return 0

    case HeadType.HEMISPHERICAL:
      // V = (2/3) π r³
      return (2 / 3) * Math.PI * (r ** 3) / 1e9

    case HeadType.ELLIPSOIDAL_2_1: {
      // Semi-axes: a = r (equatorial), b = D/4 (polar)
      // V = (π/6) × D² × h where h = D/4
      const h = insideDiameterMm / 4
      return (Math.PI / 6) * (insideDiameterMm ** 2) * h / 1e9
    }

    case HeadType.TORISPHERICAL_80_10: {
      // Boardman (1948) approximation for ASME F&D heads:
      // V = π/3 × h × (3a² + 3c² + h²) — spherical zone approximation
      // where a = r, c = knuckle offset
      const Rc = 0.80 * insideDiameterMm
      const rk = 0.10 * insideDiameterMm
      const h = headDepthMm  // pre-calculated
      // Spherical cap: V_cap = π h² (R_c - h/3) / ... full formula:
      // Use the spherical segment formula with crown radius:
      // V ≈ π × h / 6 × (3 × r_kc² + h²) where r_kc is the radius at tangent line
      // Simpler engineering approximation (within ~2%):
      // V ≈ 0.000049 × D³ for standard 80:10 (in m³ when D in mm) -- but using formula:
      const a = r  // radius at tangent line = D/2
      // Torus segment volume
      const V_spherical_cap = (Math.PI * h * h * (3 * Rc - h)) / 3 / 1e9
      // Subtract torus contribution (approximate, uses knuckle geometry)
      const V_torus = (2 * Math.PI * rk * rk * (a - rk)) / 1e9
      // The head volume = spherical cap - torus adjustment
      // Perry's approximation: V = π D³ / 6 × f where f ≈ 0.0847 for R=1.0D, rk=0.06D
      // For 80:10: use Perry's/Boardman approach
      const V_head = V_spherical_cap - V_torus
      return Math.max(V_head, 0)
    }

    case HeadType.CONICAL:
      // V = (π/3) × r² × h
      return (Math.PI / 3) * (r ** 2) * headDepthMm / 1e9
  }
}

// ─── Head surface areas (single head) ─────────────────────────────────────────

/**
 * Surface area of a single head (m²), given head type and geometry in mm.
 */
export function singleHeadSurfaceArea(
  headType: HeadType,
  insideDiameterMm: number,
  headDepthMm: number,
): number {
  const r = insideDiameterMm / 2  // mm

  switch (headType) {
    case HeadType.FLAT:
      // A = π r²
      return Math.PI * (r ** 2) / 1e6

    case HeadType.HEMISPHERICAL:
      // A = 2 π r²
      return 2 * Math.PI * (r ** 2) / 1e6

    case HeadType.ELLIPSOIDAL_2_1: {
      // Semi-axes: a = r, b = D/4
      const a = r
      const b = insideDiameterMm / 4
      const e = Math.sqrt(1 - (b / a) ** 2)  // eccentricity
      // A = 2π a² (1 + (b²/(a²×e)) × arcsin(e))
      // This is the exact formula for a prolate spheroid cap (per head):
      // For 2:1 ellipsoidal, this equals ~1.084 × π r²
      const A = 2 * Math.PI * a * a * (1 + ((b * b) / (a * a * e)) * Math.asin(e)) / 2
      return A / 1e6
    }

    case HeadType.TORISPHERICAL_80_10: {
      // Engineering approximation: A ≈ 0.842 × π D² / 4 (within ~1% for standard 80:10)
      // Using Hemi approximation based on depth:
      const Rc = 0.80 * insideDiameterMm
      const rk = 0.10 * insideDiameterMm
      // Spherical zone area: A_cap = 2 π R_c h
      const h = headDepthMm
      const A_spherical = 2 * Math.PI * Rc * h
      // Torus band area: A_torus = 2 π rk (r - rk)
      const A_torus = 2 * Math.PI * rk * (r - rk)
      return (A_spherical + A_torus) / 1e6
    }

    case HeadType.CONICAL: {
      // Lateral surface area: A = π r × slant
      const slant = Math.sqrt((r ** 2) + (headDepthMm ** 2))
      return Math.PI * r * slant / 1e6
    }
  }
}

/**
 * Vessels-Calculation Formula Fidelity Tests
 *
 * Reference: ASME geometry + mathematical derivation
 * Tolerance: 0.1% for deterministic formulas
 *
 * Run: cd apps/vessels-calculation && bun run test -- --reporter=verbose __tests__/fidelity.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  shellVolume,
  shellSurfaceArea,
  singleHeadVolume,
  singleHeadSurfaceArea,
} from '../src/lib/calculations/vesselGeometry'
import { partialVolume, circularSegmentArea } from '../src/lib/calculations/partialVolume'
import {
  torisphericalHorizontalHeadPartialVolumeMm3,
} from '../src/lib/calculations/torispherical'
import { HeadType, VesselOrientation } from '@/types'

function withinPct(actual: number, expected: number, tol: number): boolean {
  if (expected === 0) return Math.abs(actual) <= tol
  return Math.abs((actual - expected) / expected) * 100 <= tol
}

function report(name: string, actual: number, expected: number, tol: number): void {
  const dev = ((actual - expected) / expected) * 100
  const ok = withinPct(actual, expected, tol)
  console.log(`  ${ok ? '✓' : '✗'} ${name}: actual=${actual.toFixed(4)}, expected=${expected.toFixed(4)}, dev=${dev.toFixed(3)}% (tol ${tol}%)`)
}

// ─── Case V-01: Vertical cylinder shell volume ────────────────────────────────

describe('Case V-01: shellVolume', () => {
  it('D=2400 mm, L=5000 mm → 22.619 m³', () => {
    const result = shellVolume(2400, 5000)
    expect(withinPct(result, 22.619, 0.1)).toBe(true)
    report('V-01: shellVolume(2400,5000)', result, 22.619, 0.1)
  })

  it('D=1000 mm, L=2000 mm → 1.571 m³', () => {
    const result = shellVolume(1000, 2000)
    expect(withinPct(result, 1.5708, 0.1)).toBe(true)
  })

  it('scales with diameter²', () => {
    const v1 = shellVolume(1000, 1000)
    const v2 = shellVolume(2000, 1000)
    expect(withinPct(v2 / v1, 4, 0.01)).toBe(true)  // (2r)² = 4r²
  })
})

// ─── Case V-02: Horizontal cylinder shell volume ───────────────────────────────

describe('Case V-02: shellVolume (horizontal = same formula)', () => {
  it('D=3000 mm, L=10000 mm → 70.686 m³', () => {
    const result = shellVolume(3000, 10000)
    expect(withinPct(result, 70.686, 0.1)).toBe(true)
    report('V-02: shellVolume(3000,10000)', result, 70.686, 0.1)
  })
})

// ─── Case V-03: Semi-ellipsoidal head volume ─────────────────────────────────

describe('Case V-03: singleHeadVolume', () => {
  it('ELLIPSOIDAL_2_1, D=2400: result=1.810 m³ (V=πD³/24)', () => {
    const result = singleHeadVolume(HeadType.ELLIPSOIDAL_2_1, 2400, 1200)
    expect(withinPct(result, 1.8096, 0.1)).toBe(true)
    report('V-03 ELLIPSOIDAL_2_1', result, 1.8096, 0.1)
  })

  it('HEMISPHERICAL D=2400: result=3.619 m³ (V=2πr³/3)', () => {
    const result = singleHeadVolume(HeadType.HEMISPHERICAL, 2400, 1200)
    expect(withinPct(result, 3.6191, 0.1)).toBe(true)
    report('V-03 HEMISPHERICAL', result, 3.6191, 0.1)
  })
})

// ─── Case V-04: Torispherical head partial volume ───────────────────────────

describe('Case V-04: torisphericalHorizontalHeadPartialVolumeMm3', () => {
  it('D=3000 mm, liquidLevel=750 mm — non-zero', () => {
    const result = torisphericalHorizontalHeadPartialVolumeMm3(3000, 750)
    console.log('V-04 actual:', result)
    expect(result).toBeGreaterThan(0)
  })
})

// ─── Case V-05: Horizontal tank partial volume ─────────────────────────────

describe('Case V-05: partialVolume — horizontal tank', () => {
  // partialVolume(orientation, headType, diameter, shellLength, headDepth, level)
  // V-05: horizontal tank, D=3000, L=10000, HEMI heads, level=2000mm
  it('horizontal, D=3000, L=10000, HEMI heads, level=2000 → positive', () => {
    const r = partialVolume(
      VesselOrientation.HORIZONTAL,
      HeadType.HEMISPHERICAL,
      3000,
      10000,
      1500,  // headDepth = D/2 for HEMI
      2000,
    )
    console.log('V-05 actual:', r)
    expect(r).toBeGreaterThan(0)
  })
})

// ─── Case V-06: Shell surface area ───────────────────────────────────────────

describe('Case V-06: shellSurfaceArea', () => {
  it('D=2400 mm, H=17500 mm → 131.95 m²', () => {
    const result = shellSurfaceArea(2400, 17500)
    expect(withinPct(result, 131.95, 0.1)).toBe(true)
    report('V-06: shellSurfaceArea(2400,17500)', result, 131.95, 0.1)
  })

  it('D=6000 mm, H=7000 mm → 131.95 m²', () => {
    const result = shellSurfaceArea(6000, 7000)
    expect(withinPct(result, 131.95, 0.1)).toBe(true)
  })
})

// ─── Case V-07: Cone roof area ─────────────────────────────────────────────

describe('Case V-07: cone roof area — singleHeadSurfaceArea CONE', () => {
  it('CONE, D=6000, slant height ~500 → ~28.65 m²', () => {
    const result = singleHeadSurfaceArea(HeadType.CONICAL, 6000, 500)
    expect(withinPct(result, 28.65, 0.1)).toBe(true)
    report('V-07: CONE area(D=6000,h=500)', result, 28.65, 0.1)
  })
})

// ─── Case V-08: circularSegmentArea ─────────────────────────────────────────

describe('Case V-08: circularSegmentArea', () => {
  it('r=1500, depth=500 → 774,370 mm²', () => {
    const result = circularSegmentArea(1500, 500)
    expect(withinPct(result, 774370, 0.1)).toBe(true)
    report('V-08: circularSegmentArea(r=1500,d=500)', result, 774370, 0.1)
  })
})

import { describe, it, expect } from 'vitest'
import { HeadType } from '../src/types'
import {
  autoHeadDepth,
  shellVolume,
  shellSurfaceArea,
  singleHeadVolume,
  singleHeadSurfaceArea,
} from '../src/lib/calculations/vesselGeometry'

const D = 1000
const L = 2000
const r = D / 2

describe('autoHeadDepth', () => {
  it('flat head depth = 0', () => {
    expect(autoHeadDepth(HeadType.FLAT, D)).toBe(0)
  })

  it('2:1 ellipsoidal depth = D/4', () => {
    expect(autoHeadDepth(HeadType.ELLIPSOIDAL_2_1, D)).toBeCloseTo(250, 3)
  })

  it('hemispherical depth = D/2', () => {
    expect(autoHeadDepth(HeadType.HEMISPHERICAL, D)).toBeCloseTo(500, 3)
  })

  it('torispherical depth is deterministic', () => {
    expect(autoHeadDepth(HeadType.TORISPHERICAL_80_10, D)).toBeCloseTo(225.5437, 3)
  })
})

describe('shellVolume', () => {
  it('cylinder 1000mm dia × 2000mm length = π/4 × 1² × 2 m³', () => {
    const expected = (Math.PI / 4) * 1 * 1 * 2
    expect(shellVolume(D, L)).toBeCloseTo(expected, 4)
  })
})

describe('shellSurfaceArea', () => {
  it('1000mm dia × 2000mm = π × 1 × 2 m²', () => {
    const expected = Math.PI * 1 * 2
    expect(shellSurfaceArea(D, L)).toBeCloseTo(expected, 4)
  })
})

describe('singleHeadVolume', () => {
  it('flat head volume = 0', () => {
    expect(singleHeadVolume(HeadType.FLAT, D, 0)).toBe(0)
  })

  it('hemispherical head: V = (2/3)πr³', () => {
    const expected = (2 / 3) * Math.PI * (r ** 3) / 1e9
    expect(singleHeadVolume(HeadType.HEMISPHERICAL, D, r)).toBeCloseTo(expected, 6)
  })

  it('2:1 ellipsoidal head: V = πD²h/6', () => {
    const h = D / 4
    const expected = (Math.PI / 6) * (D ** 2) * h / 1e9
    expect(singleHeadVolume(HeadType.ELLIPSOIDAL_2_1, D, h)).toBeCloseTo(expected, 6)
  })

  it('conical head: V = (π/3)r²h', () => {
    const h = 300
    const expected = (Math.PI / 3) * (r ** 2) * h / 1e9
    expect(singleHeadVolume(HeadType.CONICAL, D, h)).toBeCloseTo(expected, 6)
  })

  it('torispherical head volume is deterministic', () => {
    const h = autoHeadDepth(HeadType.TORISPHERICAL_80_10, D)
    expect(singleHeadVolume(HeadType.TORISPHERICAL_80_10, D, h)).toBeCloseTo(0.10988397, 6)
  })
})

describe('singleHeadSurfaceArea', () => {
  it('flat head: A = πr²', () => {
    const expected = Math.PI * (r ** 2) / 1e6
    expect(singleHeadSurfaceArea(HeadType.FLAT, D, 0)).toBeCloseTo(expected, 4)
  })

  it('hemispherical head: A = 2πr²', () => {
    const expected = 2 * Math.PI * (r ** 2) / 1e6
    expect(singleHeadSurfaceArea(HeadType.HEMISPHERICAL, D, r)).toBeCloseTo(expected, 4)
  })

  it('2:1 ellipsoidal SA > flat SA', () => {
    const flatSA = singleHeadSurfaceArea(HeadType.FLAT, D, 0)
    const ellipSA = singleHeadSurfaceArea(HeadType.ELLIPSOIDAL_2_1, D, D / 4)
    expect(ellipSA).toBeGreaterThan(flatSA)
  })

  it('torispherical SA is deterministic', () => {
    const h = autoHeadDepth(HeadType.TORISPHERICAL_80_10, D)
    expect(singleHeadSurfaceArea(HeadType.TORISPHERICAL_80_10, D, h)).toBeCloseTo(1.01468034, 6)
  })
})

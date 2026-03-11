import { describe, it, expect } from 'vitest'
import { HeadType, VesselOrientation } from '../src/types'
import { partialVolume, headPartialVolume } from '../src/lib/calculations/partialVolume'
import { shellVolume, singleHeadVolume, autoHeadDepth } from '../src/lib/calculations/vesselGeometry'

const D = 1000
const L = 2000
const headType = HeadType.ELLIPSOIDAL_2_1
const headDepth = autoHeadDepth(headType, D)

describe('partialVolume — vertical vessel', () => {
  const ori = VesselOrientation.VERTICAL

  it('level = 0 → 0 volume', () => {
    expect(partialVolume(ori, headType, D, L, headDepth, 0)).toBe(0)
  })

  it('level = shellLength → bottom head + partial shell fill', () => {
    const v = partialVolume(ori, headType, D, L, headDepth, L)
    const headVol = singleHeadVolume(headType, D, headDepth)
    expect(v).toBeGreaterThan(headVol)
    expect(v).toBeGreaterThan(0.9)
    expect(v).toBeLessThan(shellVolume(D, L) + 2 * headVol)
  })

  it('full vessel level = total height → full volume', () => {
    const totalH = 2 * headDepth + L
    const full = partialVolume(ori, headType, D, L, headDepth, totalH)
    const expected = shellVolume(D, L) + 2 * singleHeadVolume(headType, D, headDepth)
    expect(full).toBeCloseTo(expected, 4)
  })
})

describe('partialVolume — horizontal vessel', () => {
  const ori = VesselOrientation.HORIZONTAL

  it('level = 0 → 0 volume', () => {
    expect(partialVolume(ori, headType, D, L, headDepth, 0)).toBe(0)
  })

  it('level = r → ~half shell volume', () => {
    const r = D / 2
    const v = partialVolume(ori, headType, D, L, headDepth, r)
    const shellVol = shellVolume(D, L)
    expect(v).toBeGreaterThan(shellVol * 0.45)
    expect(v).toBeLessThan(shellVol * 0.65)
  })
})

describe('headPartialVolume — torispherical', () => {
  it('full fill equals full single head volume', () => {
    const c = autoHeadDepth(HeadType.TORISPHERICAL_80_10, D)
    const partial = headPartialVolume(HeadType.TORISPHERICAL_80_10, D, c, c)
    const full = singleHeadVolume(HeadType.TORISPHERICAL_80_10, D, c)
    expect(partial).toBeCloseTo(full, 8)
  })

  it('increases monotonically with level', () => {
    const c = autoHeadDepth(HeadType.TORISPHERICAL_80_10, D)
    const levels = [0, c * 0.2, c * 0.4, c * 0.6, c * 0.8, c]
    let prev = -1
    for (const level of levels) {
      const v = headPartialVolume(HeadType.TORISPHERICAL_80_10, D, c, level)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })
})

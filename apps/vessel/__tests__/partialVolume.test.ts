import { describe, it, expect } from 'vitest'
import { HeadType, VesselOrientation } from '../src/types'
import { partialVolume } from '../src/lib/calculations/partialVolume'
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
    // Level is measured from BOTTOM OF VESSEL (including head depth).
    // At level = shellLength (2000mm), with headDepth=250mm:
    //   bottom head fully submerged + shell filled to (2000 - 250) = 1750mm
    // So v < full shell volume, but v > 0.
    const v = partialVolume(ori, headType, D, L, headDepth, L)
    const headVol = singleHeadVolume(headType, D, headDepth)
    expect(v).toBeGreaterThan(headVol)          // at least the bottom head
    expect(v).toBeGreaterThan(0.9)              // sanity: >0.9 m³
    expect(v).toBeLessThan(shellVolume(D, L) + 2 * headVol)   // less than total
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
    // Half should be within 5% of shellVol/2
    expect(v).toBeGreaterThan(shellVol * 0.45)
    expect(v).toBeLessThan(shellVol * 0.65)
  })
})

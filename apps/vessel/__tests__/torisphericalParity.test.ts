import { describe, it, expect } from 'vitest'
import { computeVesselResult } from '../src/lib/calculations'
import { HeadType, VesselOrientation } from '../src/types'

const D_MM = 1000
const L_MM = 2000

function input(orientation: VesselOrientation, liquidLevel: number) {
  return {
    tag: 'P-1',
    orientation,
    headType: HeadType.TORISPHERICAL_80_10,
    insideDiameter: D_MM,
    shellLength: L_MM,
    liquidLevel,
    metadata: { projectNumber: '', documentNumber: '', title: '', projectName: '', client: '' },
  }
}

describe('torispherical parity vs python (may3rd/vessels, fd=0.8 fk=0.1)', () => {
  it('matches vertical volume/wetted vectors', () => {
    const vectors = [
      { h: 0, volume: 0, wetted: 0 },
      { h: 100, volume: 0.024085543677521772, wetted: 0.5026548245743669 },
      { h: Number('225.54373534619707'), volume: 0.1098839681313536, wetted: 1.0146803397348485 },
      { h: 500, volume: 0.3254414143233745, wetted: 1.876910124502932 },
      { h: 1000, volume: 0.7181404960220985, wetted: 3.4477064512978286 },
      { h: 2000, volume: 1.503538659419547, wetted: 6.589299104887622 },
      { h: Number('2451.087470692394'), volume: 1.790564263057604, wetted: 8.312545986649281 },
    ]

    for (const v of vectors) {
      const result = computeVesselResult(input(VesselOrientation.VERTICAL, v.h))
      expect(result.volumes.partialVolume ?? 0).toBeCloseTo(v.volume, 6)
      expect(result.surfaceAreas.wettedSurfaceArea).toBeCloseTo(v.wetted, 6)
    }
  })

  it('matches horizontal volume vectors and tracks wetted area within tolerance band', () => {
    const vectors = [
      { h: 0, volume: 0, wetted: 0 },
      { h: 100, volume: 0.08772280239171298, wetted: 1.4579243913207225 },
      { h: 250, volume: 0.3403516475884512, wetted: 2.615068115289922 },
      { h: 500, volume: 0.8952821316526083, wetted: 4.156272993324642 },
      { h: 750, volume: 1.4502126156275321, wetted: 5.697477871359363 },
      { h: 1000, volume: 1.7905642633052163, wetted: 8.312545986649283 },
    ]

    for (const v of vectors) {
      const result = computeVesselResult(input(VesselOrientation.HORIZONTAL, v.h))
      expect(result.volumes.partialVolume ?? 0).toBeCloseTo(v.volume, 6)
      expect(Math.abs(result.surfaceAreas.wettedSurfaceArea - v.wetted)).toBeLessThanOrEqual(0.08)
    }
  })
})

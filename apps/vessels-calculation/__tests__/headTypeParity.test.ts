import { describe, it, expect } from 'vitest'
import { computeVesselResult } from '../src/lib/calculations'
import { HeadType, VesselOrientation } from '../src/types'

const META = { projectNumber: '', documentNumber: '', title: '', projectName: '', client: '' }

function runCase(
  orientation: VesselOrientation,
  headType: HeadType,
  levels: number[],
  expectedVolumes: number[],
  expectedWetted: number[],
  tolerances: { volume: number; wetted: number },
  headDepth?: number,
) {
  for (let i = 0; i < levels.length; i += 1) {
    const result = computeVesselResult({
      tag: 'P-1',
      orientation,
      headType,
      insideDiameter: 1000,
      shellLength: 2000,
      headDepth,
      liquidLevel: levels[i],
      metadata: META,
    })

    const actualV = result.volumes.partialVolume ?? 0
    const actualW = result.surfaceAreas.wettedSurfaceArea

    expect(Math.abs(actualV - expectedVolumes[i])).toBeLessThanOrEqual(tolerances.volume)
    expect(Math.abs(actualW - expectedWetted[i])).toBeLessThanOrEqual(tolerances.wetted)
  }
}

describe('head type parity vs python vectors', () => {
  it('vertical elliptical', () => {
    runCase(
      VesselOrientation.VERTICAL,
      HeadType.ELLIPSOIDAL_2_1,
      [0, 100, 250, 500, 1000, 2000],
      [0, 0.027227136331111543, 0.1308996938995747, 0.32724923474893675, 0.7199483164476609, 1.5053464798451093],
      [0, 0.5672447115599132, 1.1035926184591986, 1.888990781856647, 3.4597871086515433, 6.601379762241336],
      { volume: 1e-6, wetted: 0.36 },
    )
  })

  it('horizontal elliptical', () => {
    runCase(
      VesselOrientation.HORIZONTAL,
      HeadType.ELLIPSOIDAL_2_1,
      [0, 100, 250, 500, 750, 1000],
      [0, 0.08908093725501827, 0.3479985789958063, 0.916297857297023, 1.4845971355982397, 1.832595714594046],
      [0, 1.476953532486192, 2.650509701172945, 4.245185272048992, 5.839860842925039, 8.490370544097983],
      { volume: 0.011, wetted: 0.17 },
    )
  })

  it('vertical hemispherical', () => {
    runCase(
      VesselOrientation.VERTICAL,
      HeadType.HEMISPHERICAL,
      [0, 100, 250, 500, 1000, 2000],
      [0, 0.014660765716752367, 0.0818123086872342, 0.2617993877991494, 0.6544984694978735, 1.4398966328953218],
      [0, 0.3141592653589793, 0.7853981633974483, 1.5707963267948966, 3.141592653589793, 6.283185307179586],
      { volume: 1e-6, wetted: 1e-6 },
    )
  })

  it('horizontal hemispherical', () => {
    runCase(
      VesselOrientation.HORIZONTAL,
      HeadType.HEMISPHERICAL,
      [0, 100, 250, 500, 750, 1000],
      [0, 0.09641132011339446, 0.3889047333394234, 1.0471975511965976, 1.7054903690537722, 2.0943951023931953],
      [0, 1.6011614829455478, 2.8797932657906435, 4.71238898038469, 6.544984694978736, 9.42477796076938],
      { volume: 1e-6, wetted: 1e-6 },
    )
  })

  it('vertical conical (head depth 0.3 m)', () => {
    runCase(
      VesselOrientation.VERTICAL,
      HeadType.CONICAL,
      [0, 100, 250, 500, 1000, 2000, 2600],
      [0, 0.0029088820866572163, 0.045451282604019, 0.23561944901923448, 0.6283185307179586, 1.413716694115407, 1.7278759594743862],
      [0, 0.10176930909045269, 0.6360581818153292, 1.5442423125320324, 3.115038639326929, 6.2566312929167225, 8.115032870807735],
      { volume: 1e-6, wetted: 1e-6 },
      300,
    )
  })

  it('horizontal conical (head depth 0.3 m)', () => {
    runCase(
      VesselOrientation.HORIZONTAL,
      HeadType.CONICAL,
      [0, 100, 250, 500, 750, 1000],
      [0, 0.0836701776586409, 0.3243820188785772, 0.8639379797371931, 1.403493940595809, 1.7278759594743862],
      [0, 1.3823389275993194, 2.4525233334768592, 4.057516435403867, 5.662509537330875, 8.115032870807735],
      { volume: 0.014, wetted: 1e-6 },
      300,
    )
  })
})

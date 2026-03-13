import { describe, expect, it } from 'vitest'

import { buildVesselSchematicModel } from '@/lib/schematics/vesselSchematicModel'
import {
  EquipmentMode,
  HeadType,
  VesselMaterial,
  VesselOrientation,
  type CalculationInput,
} from '@/types'

const INPUT: CalculationInput = {
  tag: 'V-101',
  description: 'Vertical vessel parity case',
  equipmentMode: EquipmentMode.VESSEL,
  orientation: VesselOrientation.VERTICAL,
  headType: HeadType.ELLIPSOIDAL_2_1,
  material: VesselMaterial.CS,
  insideDiameter: 3000,
  shellLength: 18000,
  wallThickness: 12,
  materialDensity: 7850,
  bottomHeight: 1200,
  bootInsideDiameter: 900,
  bootHeight: 1800,
  liquidLevel: 9000,
  hll: 11000,
  lll: 5000,
  ofl: 13000,
  density: 900,
  flowrate: 25,
  metadata: {
    projectNumber: '',
    documentNumber: '',
    title: '',
    projectName: '',
    client: '',
  },
}

describe('buildVesselSchematicModel', () => {
  it('returns shared geometry for the live and PDF vessel renderers', () => {
    const model = buildVesselSchematicModel({
      input: INPUT,
      width: 520,
      height: 420,
      padding: 48,
      zoomOutFactor: 1,
    })

    expect(model).not.toBeNull()
    expect(model?.isTruncated).toBe(true)
    expect(model?.clipPaths.vesselId).toBe('vesselClip')
    expect(model?.clipPaths.bootId).toBe('bootClip')
    expect(model?.fills.vessel).toBeTruthy()
    expect(model?.fills.boot).toBeTruthy()
    expect(model?.levels.map((level) => level.name)).toEqual(['LL', 'HLL', 'LLL', 'OFL'])
    expect(model?.annotations.map((annotation) => annotation.key)).toEqual(
      expect.arrayContaining(['tt', 'diameter', 'bottomHeight', 'bootHeight', 'bootDiameter']),
    )
    expect(model?.captionParts).toEqual([
      'T-T: 18.00m',
      'D: 3.00m',
      '(truncated in drawing)',
      'Btm: 1.20m',
      'BH: 1.80m',
      'BD: 0.90m',
    ])
  })

  it('places the horizontal vessel diameter dimension on the left side', () => {
    const model = buildVesselSchematicModel({
      input: {
        ...INPUT,
        orientation: VesselOrientation.HORIZONTAL,
        shellLength: 3000,
        bootInsideDiameter: undefined,
        bootHeight: undefined,
      },
      width: 520,
      height: 420,
      padding: 48,
    })

    expect(model).not.toBeNull()

    const diameter = model?.annotations.find((annotation) => annotation.key === 'diameter')
    const tt = model?.annotations.find((annotation) => annotation.key === 'tt')

    expect(diameter?.vertical).toBe(true)
    expect(diameter?.x1).toBeLessThan(tt?.x1 ?? Number.POSITIVE_INFINITY)
    expect(model?.guideLines.find((guideLine) => guideLine.key === 'd-top-guide')?.x2).toBeLessThan(
      model?.guideLines.find((guideLine) => guideLine.key === 'tt-left-guide')?.x1 ?? Number.POSITIVE_INFINITY,
    )
  })
})

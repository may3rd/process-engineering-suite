import { describe, it, expect } from 'vitest'
import { convertUnit } from '@eng-suite/physics'
import { BASE_UNITS, vesselUomOptions, type VesselUomCategory } from '../src/lib/uom'

const TOLERANCE = 1e-9
const TEST_VALUES: Record<VesselUomCategory, number> = {
  length:     1000,   // 1000 mm
  density:    850,    // 850 kg/m3
  volumeFlow: 10,     // 10 m3/h
  volume:     1.5,    // 1.5 m3
  area:       5.0,    // 5 m2
  mass:       1000,   // 1000 kg
}

describe('UoM round-trip conversions', () => {
  const categories = Object.keys(BASE_UNITS) as VesselUomCategory[]

  for (const category of categories) {
    const baseUnit = BASE_UNITS[category]
    const options = vesselUomOptions(category)
    const baseValue = TEST_VALUES[category]

    for (const displayUnit of options) {
      it(`${category}: ${baseUnit} → ${displayUnit} → ${baseUnit} round-trips within ${TOLERANCE}`, () => {
        const displayed = convertUnit(baseValue, baseUnit, displayUnit)
        const roundTripped = convertUnit(displayed, displayUnit, baseUnit)
        expect(roundTripped).toBeCloseTo(baseValue, 6)
        expect(Math.abs(roundTripped - baseValue)).toBeLessThan(TOLERANCE * Math.abs(baseValue) + TOLERANCE)
      })
    }
  }

  it('converting to own base unit is identity', () => {
    for (const category of categories) {
      const baseUnit = BASE_UNITS[category]
      const val = TEST_VALUES[category]
      expect(convertUnit(val, baseUnit, baseUnit)).toBeCloseTo(val, 9)
    }
  })

  it('vesselUomOptions returns non-empty arrays for all categories', () => {
    for (const category of categories) {
      const opts = vesselUomOptions(category)
      expect(opts.length).toBeGreaterThan(0)
    }
  })

  it('base unit is always included in its own options', () => {
    for (const category of categories) {
      const opts = vesselUomOptions(category)
      const base = BASE_UNITS[category]
      expect(opts).toContain(base)
    }
  })
})

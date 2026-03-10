import { describe, it, expect } from 'vitest'
import {
  dpToHead,
  calcSuctionPressure,
  calcDischargePressure,
  calcNpsha,
  calcHydraulicPower,
  calcShaftPower,
  calcApiMinMotor,
  calcOrificeDeltaP,
  calcMinFlow,
  calcShutoffHead,
} from '../src/lib/calculations/pumpCalc'
import { nextStandardMotor, STANDARD_MOTOR_KW } from '../src/lib/calculations/motorTable'
import { ShutoffMethod, PumpType } from '../src/types'
import type { CalculationInput } from '../src/types'

describe('dpToHead', () => {
  it('converts differential pressure to head', () => {
    // dP = 200 kPa, sg = 0.8 → head = 200 / (0.8 × 9.80665) = 25.484 m
    expect(dpToHead(200, 0.8)).toBeCloseTo(25.48, 1)
  })

  it('converts water at 101.325 kPa to ~10.33 m', () => {
    expect(dpToHead(101.325, 1.0)).toBeCloseTo(10.33, 1)
  })
})

describe('calcNpsha', () => {
  it('calculates NPSHa correctly', () => {
    // P_suction=200 kPa, P_vapour=20 kPa, sg=0.8
    // NPSHa = (200-20) / (0.8×9.80665) = 180/7.845 ≈ 22.94 m
    expect(calcNpsha(200, 20, 0.8)).toBeCloseTo(22.94, 1)
  })

  it('subtracts acceleration head when provided', () => {
    const base = calcNpsha(200, 20, 0.8)
    const withAccel = calcNpsha(200, 20, 0.8, 2.0)
    expect(withAccel).toBeCloseTo(base - 2.0, 4)
  })
})

describe('calcHydraulicPower', () => {
  it('calculates hydraulic power correctly', () => {
    // Q=100 m3/h, head=50 m, sg=1.0
    // P = 1.0 × 9.80665 × 100 × 50 / 3600 = 13.620 kW
    expect(calcHydraulicPower(100, 50, 1.0)).toBeCloseTo(13.62, 1)
  })

  it('scales with specific gravity', () => {
    const water = calcHydraulicPower(100, 50, 1.0)
    const crude = calcHydraulicPower(100, 50, 0.85)
    expect(crude).toBeCloseTo(water * 0.85, 4)
  })
})

describe('calcShaftPower', () => {
  it('applies efficiency and wear margin', () => {
    // hydraulic=10 kW, eff=75%, margin=5%
    // shaft = 10 / 0.75 × 1.05 = 14.0 kW
    expect(calcShaftPower(10, 75, 5)).toBeCloseTo(14.0, 2)
  })

  it('at 100% efficiency and 0% margin equals hydraulic power', () => {
    expect(calcShaftPower(10, 100, 0)).toBeCloseTo(10, 4)
  })
})

describe('nextStandardMotor', () => {
  it('returns exact match on ladder', () => {
    expect(nextStandardMotor(15)).toBe(15)
    expect(nextStandardMotor(75)).toBe(75)
  })

  it('rounds up to next standard size', () => {
    expect(nextStandardMotor(14)).toBe(15)
    expect(nextStandardMotor(10)).toBe(11)
    expect(nextStandardMotor(16)).toBe(18.5)
  })

  it('returns smallest motor for very small values', () => {
    expect(nextStandardMotor(0.1)).toBe(STANDARD_MOTOR_KW[0])
  })

  it('returns largest motor when exceeding table', () => {
    const last = STANDARD_MOTOR_KW[STANDARD_MOTOR_KW.length - 1]!
    expect(nextStandardMotor(last + 100)).toBe(last)
  })

  it('has 39 standard sizes', () => {
    expect(STANDARD_MOTOR_KW.length).toBe(39)
  })
})

describe('calcMinFlow (temperature rise)', () => {
  it('calculates min flow using SI energy balance', () => {
    // P_shutoff=10 kW, sg=1.0, Cp=4.18 kJ/(kg·°C), ΔT=10 °C
    // Q_min = (10 × 3600) / (1.0 × 1000 × 4.18 × 10) = 36000 / 41800 ≈ 0.8612 m³/h
    expect(calcMinFlow(10, 1.0, 4.18, 10)).toBeCloseTo(0.8612, 3)
  })

  it('scales linearly with power', () => {
    const q1 = calcMinFlow(10, 1.0, 4.18, 10)
    const q2 = calcMinFlow(20, 1.0, 4.18, 10)
    expect(q2).toBeCloseTo(q1 * 2, 6)
  })
})

describe('calcShutoffHead', () => {
  it('method A - curve factor multiplies design head', () => {
    const result = calcShutoffHead(ShutoffMethod.CURVE_FACTOR, 100, 200, 1.0, { curveFactor: 1.15 })
    expect(result.headM).toBeCloseTo(115, 4)
    // pressure = 200 + 115 × 1.0 × 9.80665 = 200 + 1127.76 kPa
    expect(result.pressureKpa).toBeCloseTo(200 + 115 * 9.80665, 1)
  })

  it('method C - uses known head directly', () => {
    const result = calcShutoffHead(ShutoffMethod.KNOWN_HEAD, 100, 200, 1.0, { knownHeadM: 130 })
    expect(result.headM).toBe(130)
  })
})

describe('calcSuctionPressure', () => {
  const baseInput: CalculationInput = {
    tag: 'P-101',
    pumpType: PumpType.CENTRIFUGAL,
    flowDesign: 100,
    temperature: 25,
    sg: 1.0,
    vapourPressure: 3.17,
    viscosity: 1.0,
    suctionSourcePressure: 200,
    suctionElevation: 5,
    suctionLineLoss: 10,
    suctionStrainerLoss: 5,
    suctionOtherLoss: 2,
    dischargeDestPressure: 500,
    dischargeElevation: 20,
    dischargeEquipmentDp: 100,
    dischargeLineLoss: 30,
    dischargeFlowElementDp: 25,
    dischargeDesignMargin: 50,
    wearMarginPct: 5,
    efficiency: 75,
    calculateAccelHead: false,
    showOrifice: false,
    showControlValve: false,
    showMinFlow: false,
    showShutoff: false,
    metadata: { projectNumber: '', documentNumber: '', title: '', projectName: '', client: '' },
  }

  it('adds static head from elevation above pump', () => {
    // P_suction = 200 + (1.0 × 9.80665 × 5) - (10 + 5 + 2) = 200 + 49.033 - 17 = 232.033 kPa
    expect(calcSuctionPressure(baseInput)).toBeCloseTo(232.03, 1)
  })

  it('subtracts losses from suction pressure', () => {
    const noLoss = calcSuctionPressure({ ...baseInput, suctionLineLoss: 0, suctionStrainerLoss: 0, suctionOtherLoss: 0 })
    const withLoss = calcSuctionPressure(baseInput)
    expect(noLoss - withLoss).toBeCloseTo(17, 4)
  })
})

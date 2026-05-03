/**
 * Pump-Calculation Formula Fidelity Tests
 *
 * Reference: API 610 (11th ed.) — mathematical derivations
 * Tolerance: 5% for all values
 *
 * Run: cd apps/pump-calculation && bun run test -- --reporter=verbose __tests__/fidelity.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  dpToHead,
  calcNpsha,
  calcHydraulicPower,
  calcShaftPower,
  calcOrificeDeltaP,
  calcMinFlow,
  calcShutoffHead,
} from '../src/lib/calculations/pumpCalc'
import { nextStandardMotor } from '../src/lib/calculations/motorTable'
import { ShutoffMethod } from '../src/types'

function withinPct(actual: number, expected: number, tol: number): boolean {
  if (expected === 0) return actual === 0
  return Math.abs((actual - expected) / expected) * 100 <= tol
}

function report(name: string, actual: number, expected: number, tol: number): void {
  const dev = ((actual - expected) / expected) * 100
  const ok = withinPct(actual, expected, tol)
  console.log(`  ${ok ? '✓' : '✗'} ${name}: actual=${actual.toFixed(3)}, expected=${expected.toFixed(3)}, dev=${dev.toFixed(1)}% (tol ${tol}%)`)
}

// ─── Case PU-01: Differential head from pressure rise ────────────────────────

describe('Case PU-01: dpToHead', () => {
  it('converts 500 kPa ΔP at sg=1.2 → 42.5 m', () => {
    const result = dpToHead(500, 1.2)
    expect(withinPct(result, 42.5, 5)).toBe(true)
    report('dpToHead(500kPa, sg=1.2)', result, 42.5, 5)
  })

  it('converts 101.325 kPa water at sg=1.0 → 10.33 m', () => {
    const result = dpToHead(101.325, 1.0)
    expect(withinPct(result, 10.33, 5)).toBe(true)
  })
})

// ─── Case PU-02: NPSHa (no acceleration head) ─────────────────────────────────

describe('Case PU-02: calcNpsha', () => {
  it('calculates NPSHa=21.6 m (P_succ=200, P_vap=20, sg=0.85)', () => {
    const result = calcNpsha(200, 20, 0.85)
    expect(withinPct(result, 21.6, 5)).toBe(true)
    report('NPSHa(200,20,0.85)', result, 21.6, 5)
  })

  it('calculates NPSHa=14.3 m (P_succ=150, P_vap=10, sg=1.0)', () => {
    // NPSHa = (150-10)/(1.0*9.807) = 140/9.807 = 14.27 m
    const result = calcNpsha(150, 10, 1.0)
    expect(withinPct(result, 14.27, 5)).toBe(true)
  })
})

// ─── Case PU-03: NPSHa with acceleration head (PD pump) ───────────────────────

describe('Case PU-03: calcNpsha with acceleration head', () => {
  it('subtracts acceleration head from base NPSHa', () => {
    const base = calcNpsha(200, 20, 0.85)  // 21.6 m
    const withAccel = calcNpsha(200, 20, 0.85, 2.0)
    expect(withinPct(withAccel, base - 2.0, 5)).toBe(true)
    expect(withinPct(withAccel, 19.6, 5)).toBe(true)
    report('NPSHa with accel=2.0m', withAccel, 19.6, 5)
  })
})

// ─── Case PU-04: Hydraulic power ─────────────────────────────────────────────

describe('Case PU-04: calcHydraulicPower', () => {
  it('calculates P_hyd=49.0 kW (Q=250, H=80, sg=0.9)', () => {
    const result = calcHydraulicPower(250, 80, 0.9)
    expect(withinPct(result, 49.0, 5)).toBe(true)
    report('HydPower(250,80,0.9)', result, 49.0, 5)
  })

  it('calculates P_hyd=163.5 kW (Q=500, H=100, sg=1.2)', () => {
    // P_hyd = sg*g*Q*H/3600 = 1.2*9.807*500*100/3600 = 588,420/3600 = 163.5 kW
    const result = calcHydraulicPower(500, 100, 1.2)
    expect(withinPct(result, 163.5, 5)).toBe(true)
  })
})

// ─── Case PU-05: Shaft power (with efficiency) ───────────────────────────────

describe('Case PU-05: calcShaftPower', () => {
  it('calculates P_shaft=71.9 kW (P_hyd=49, η=75%, margin=10%)', () => {
    const result = calcShaftPower(49, 75, 10)
    expect(withinPct(result, 71.9, 5)).toBe(true)
    report('ShaftPower(49kW,75%,10%)', result, 71.9, 5)
  })

  it('at 100% efficiency and 0% margin equals hydraulic power', () => {
    const result = calcShaftPower(50, 100, 0)
    expect(withinPct(result, 50, 5)).toBe(true)
  })
})

// ─── Case PU-06: API minimum motor power ─────────────────────────────────────

describe('Case PU-06: nextStandardMotor', () => {
  it('nextStandardMotor(71.9) = 75 kW', () => {
    const result = nextStandardMotor(71.9)
    expect(withinPct(result, 75, 5)).toBe(true)
    report('nextStandardMotor(71.9)', result, 75, 5)
  })

  it('nextStandardMotor(15) = 15 (exact match)', () => {
    expect(nextStandardMotor(15)).toBe(15)
  })

  it('nextStandardMotor(100) = 110 kW', () => {
    const result = nextStandardMotor(100)
    expect(withinPct(result, 110, 5)).toBe(true)
  })
})

// ─── Case PU-07: Shut-off head ───────────────────────────────────────────────

describe('Case PU-07: calcShutoffHead', () => {
  it('calculates shutoffHead=92 m (curve_factor, designH=80, factor=1.15)', () => {
    const result = calcShutoffHead(ShutoffMethod.CURVE_FACTOR, 80, 100, 1.0, { curveFactor: 1.15 })
    expect(withinPct(result.headM, 92, 5)).toBe(true)
    report('ShutoffHead(curve,80,factor=1.15)', result.headM, 92, 5)
  })

  it('calculates shutoffHead=96 m (curve_factor, designH=80, factor=1.2)', () => {
    const result = calcShutoffHead(ShutoffMethod.CURVE_FACTOR, 80, 100, 1.0, { curveFactor: 1.2 })
    expect(withinPct(result.headM, 96, 5)).toBe(true)
  })
})

// ─── Case PU-08: Minimum flow (temperature rise) ──────────────────────────────

describe('Case PU-08: calcMinFlow', () => {
  it('calculates minimum flow above zero (shutoff=71.9kW, sg=0.85, cp=4.2, ΔT=40°C)', () => {
    // Q_min = (P_shaft × 3600) / (sg × 1000 × cp × ΔT)
    // = (71.9 × 3600) / (0.85 × 1000 × 4.2 × 40)
    // = 258,840 / 142,800 = 1.81 m³/h
    const result = calcMinFlow(71.9, 0.85, 4.2, 40)
    expect(result).toBeGreaterThan(0)
    expect(withinPct(result, 1.81, 10)).toBe(true)
    report('calcMinFlow(P_shaft=71.9, sg=0.85, cp=4.2, dT=40)', result, 1.81, 10)
  })
})

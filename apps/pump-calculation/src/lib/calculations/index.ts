import type { CalculationInput, PumpCalculationResult } from '@/types'
import { PumpType } from '@/types'
import {
  calcSuctionPressure,
  calcDischargePressure,
  dpToHead,
  calcNpsha,
  calcHydraulicPower,
  calcShaftPower,
  estimateShutoffPower,
  calcApiMinMotor,
  calcOrificeDeltaP,
  calcMinFlow,
  calcShutoffHead,
  calcRecommendedCvDp,
} from './pumpCalc'
import { nextStandardMotor } from './motorTable'

const G = 9.80665

export function computePumpResult(input: CalculationInput): PumpCalculationResult {
  // ── Core pressures ──────────────────────────────────────────────────────
  const suctionPressureKpa = calcSuctionPressure(input)
  const dischargePressureKpa = calcDischargePressure(input)
  const differentialPressureKpa = dischargePressureKpa - suctionPressureKpa

  // ── Heads ────────────────────────────────────────────────────────────────
  // Static head: elevation-only component of differential head
  const staticHeadKpa = input.sg * G * (input.dischargeElevation - input.suctionElevation)
  const staticHead = dpToHead(staticHeadKpa, input.sg)

  const differentialHead = dpToHead(differentialPressureKpa, input.sg)
  const frictionHead = differentialHead - staticHead

  // ── NPSHa ────────────────────────────────────────────────────────────────
  // Acceleration head applies only to PD pumps when flag enabled
  const accelHead =
    input.pumpType === PumpType.POSITIVE_DISPLACEMENT && input.calculateAccelHead
      ? estimateAccelHead(input)
      : undefined

  const npsha = calcNpsha(
    suctionPressureKpa,
    input.vapourPressure,
    input.sg,
    accelHead ?? 0,
  )

  // ── Power & motor ────────────────────────────────────────────────────────
  const hydraulicPowerKw = calcHydraulicPower(input.flowDesign, differentialHead, input.sg)
  const shaftPowerKw = calcShaftPower(hydraulicPowerKw, input.efficiency, input.wearMarginPct)
  const apiMinMotorKw = calcApiMinMotor(shaftPowerKw)
  const recommendedMotorKw = nextStandardMotor(apiMinMotorKw)

  // ── Optional: shut-off (computed first as minFlow depends on it) ──────────
  let shutoffPressureKpa: number | undefined
  let shutoffHead: number | undefined
  let shutoffPowerKw: number | undefined

  if (input.showShutoff && input.shutoffMethod) {
    const soh = calcShutoffHead(
      input.shutoffMethod,
      differentialHead,
      suctionPressureKpa,
      input.sg,
      {
        curveFactor: input.shutoffCurveFactor,
        ratio: input.shutoffRatio,
        knownHeadM: input.knownShutoffHead,
      },
    )
    shutoffHead = soh.headM
    shutoffPressureKpa = soh.pressureKpa

    // For centrifugal pumps, shut-off power is typically estimated from design power
    // If user provided a specific efficiency for shut-off, we could use that,
    // but usually, it's a factor of design shaft power.
    shutoffPowerKw = estimateShutoffPower(shaftPowerKw)
  }

  // ── Optional: orifice ΔP ────────────────────────────────────────────────
  const orificeDeltaPKpa =
    input.showOrifice &&
    input.orificePipeId != null &&
    input.orificeBeta != null &&
    input.orificeBeta > 0 &&
    input.orificePipeId > 0
      ? calcOrificeDeltaP(input.flowDesign, input.orificePipeId, input.orificeBeta, input.sg)
      : undefined

  // ── Optional: recommended CV ΔP ─────────────────────────────────────────
  const systemDp = differentialPressureKpa
  const recommendedCvDeltaPKpa =
    input.showControlValve && input.cvFlowRatio != null && input.cvFlowRatio > 0
      ? calcRecommendedCvDp(systemDp, input.cvFlowRatio)
      : undefined

  // ── Optional: minimum flow (temperature rise) ────────────────────────────
  const minFlowM3h =
    input.showMinFlow &&
    input.specificHeat != null &&
    input.allowedTempRise != null &&
    input.allowedTempRise > 0 &&
    shutoffPowerKw != null
      ? calcMinFlow(shutoffPowerKw, input.sg, input.specificHeat, input.allowedTempRise)
      : undefined

  return {
    suctionPressureKpa,
    dischargePressureKpa,
    differentialPressureKpa,
    differentialHead,
    staticHead,
    frictionHead,
    npsha,
    accelHead,
    hydraulicPowerKw,
    shaftPowerKw,
    apiMinMotorKw,
    recommendedMotorKw,
    orificeDeltaPKpa,
    recommendedCvDeltaPKpa,
    minFlowM3h,
    shutoffPressureKpa,
    shutoffHead,
    shutoffPowerKw,
  }
}

/**
 * Estimate acceleration head for reciprocating PD pumps.
 * Standard formula: h_accel = L * V * n * C / (G * K)
 * Since we lack suction pipe geometry (L, A_pipe) and pump speed (n),
 * we use a conservative 10% of the available static suction head as an allowance.
 * This is a common process engineering placeholder when piping design is not yet fixed.
 */
function estimateAccelHead(input: CalculationInput): number {
  const suctionHeadKpa = input.sg * G * input.suctionElevation
  if (suctionHeadKpa <= 0) return 0
  return dpToHead(suctionHeadKpa, input.sg) * 0.10
}

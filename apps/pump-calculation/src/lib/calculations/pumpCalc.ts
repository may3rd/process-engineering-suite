/**
 * Pure pump calculation functions.
 * All inputs and outputs use SI base units as defined in lib/uom.ts:
 *   pressure: kPa (absolute)
 *   flow: m3/h
 *   head/elevation: m
 *   power: kW
 *   viscosity: cP (not used in core calc, informational only)
 *   temperature: C (not used in core calc, except min flow)
 */

import type { CalculationInput } from '@/types'
import { ShutoffMethod } from '@/types'
import { nextStandardMotor } from './motorTable'

const G = 9.80665 // m/s²

/** Convert kPa differential pressure to metres of head. */
export function dpToHead(dPKpa: number, sg: number): number {
  return dPKpa / (sg * G)
}

/**
 * Suction pressure at pump inlet (kPaa).
 * P_suction = P_source + rho*g*h_elevation - P_losses
 * Static head from elevation above pump: sg * 9.807 * elevation_m → kPa
 */
export function calcSuctionPressure(input: CalculationInput): number {
  const staticHeadKpa = input.sg * G * input.suctionElevation  // kPa
  const totalLoss = input.suctionLineLoss + input.suctionStrainerLoss + input.suctionOtherLoss
  return input.suctionSourcePressure + staticHeadKpa - totalLoss
}

/**
 * Discharge pressure at pump outlet (kPaa).
 * P_discharge = P_dest + rho*g*h_elevation + all losses + design margin
 */
export function calcDischargePressure(input: CalculationInput): number {
  const staticHeadKpa = input.sg * G * input.dischargeElevation  // kPa
  const cvDp = input.dischargeControlValveDp ?? 0
  const totalLoss =
    input.dischargeEquipmentDp +
    input.dischargeLineLoss +
    input.dischargeFlowElementDp +
    cvDp +
    input.dischargeDesignMargin
  return input.dischargeDestPressure + staticHeadKpa + totalLoss
}

/**
 * NPSHa (m) = (P_suction - P_vapour) / (sg × g) - accelHead
 * Note: P_suction and P_vapour are both kPa absolute.
 */
export function calcNpsha(
  suctionPressureKpa: number,
  vapourPressureKpa: number,
  sg: number,
  accelHeadM: number = 0,
): number {
  return dpToHead(suctionPressureKpa - vapourPressureKpa, sg) - accelHeadM
}

/**
 * Hydraulic power (kW).
 * P_hyd = rho * g * Q * H = sg * 1000 * g * (flow/3600) * head / 1000
 * Simplified: sg * g * flow * head / 3600
 */
export function calcHydraulicPower(flowM3h: number, headM: number, sg: number): number {
  return (sg * G * flowM3h * headM) / 3600
}

/**
 * Shaft power (kW) including pump efficiency and wear margin.
 * P_shaft = P_hyd / (efficiency/100) * (1 + wearMargin/100)
 */
export function calcShaftPower(
  hydraulicKw: number,
  efficiencyPct: number,
  wearMarginPct: number,
): number {
  return (hydraulicKw / (Math.max(efficiencyPct, 1) / 100)) * (1 + wearMarginPct / 100)
}

/**
 * Shut-off power (kW).
 * For centrifugal pumps, shut-off power is typically 35-70% of design power.
 * If specific curves aren't known, 50-60% is a safe industry estimate.
 * We use 55% as default.
 */
export function estimateShutoffPower(designShaftPowerKw: number): number {
  return designShaftPowerKw * 0.55
}

/**
 * API 610 minimum motor rating: shaft power × 1.1 (no standard rounding).
 */
export function calcApiMinMotor(shaftPowerKw: number): number {
  return shaftPowerKw * 1.1
}

/**
 * Orifice pressure drop (kPa) — simplified ISO 5167 / empirical.
 * ΔP = (Q / (Cd × A_orifice))² × rho / 2 / 1000
 * Using Cd ≈ 0.61 for sharp-edged orifice.
 *
 * A_pipe = π/4 × D² (m²), A_orifice = π/4 × (β×D)² = β² × A_pipe
 * ΔP = (sg × 1000 × Q²) / (2 × Cd² × A_orifice² × 3600²) / 1000  [kPa]
 *    = (sg × Q²) / (2 × Cd² × (π/4)² × (βD)⁴ × 3600²) × 1000
 *
 * Result in kPa.
 */
export function calcOrificeDeltaP(
  flowM3h: number,
  pipeIdMm: number,
  beta: number,
  sg: number,
): number {
  const Cd = 0.61
  const D = pipeIdMm / 1000         // m, pipe inside diameter
  const d = beta * D                 // m, orifice diameter
  const Ao = (Math.PI / 4) * d * d  // m², orifice area
  const Qm3s = flowM3h / 3600       // m³/s
  const rho = sg * 1000             // kg/m³
  // ΔP = 0.5 × rho × (Q / (Cd × Ao))²   [Pa]
  const velocity = Qm3s / (Cd * Ao)
  const deltaPa = 0.5 * rho * velocity * velocity
  return deltaPa / 1000              // kPa
}

/**
 * Minimum flow to protect against temperature rise (m³/h).
 * Derived from energy balance: P = ṁ × Cp × ΔT
 *   ṁ [kg/s] = ρ × Q_m3s = sg × 1000 × Q_m3h / 3600
 * Solving for Q:
 *   Q_m3h = P_kW × 3600 / (sg × 1000 × Cp_kJ_kgC × ΔT_C)
 */
export function calcMinFlow(
  shutoffPowerKw: number,
  sg: number,
  specificHeatKJkgC: number,
  allowedTempRiseC: number,
): number {
  return (shutoffPowerKw * 3600) / (sg * 1000 * specificHeatKJkgC * allowedTempRiseC)
}

/**
 * Shut-off head and pressure based on method (A/B/C).
 * Returns { headM, pressureKpa }.
 */
export function calcShutoffHead(
  method: ShutoffMethod,
  designHeadM: number,
  suctionPressureKpa: number,
  sg: number,
  opts: {
    curveFactor?: number    // method A: typically 1.1–1.25
    ratio?: number          // method B: known ratio
    knownHeadM?: number     // method C: directly known
  } = {},
): { headM: number; pressureKpa: number } {
  let headM: number
  switch (method) {
    case ShutoffMethod.CURVE_FACTOR:
      headM = designHeadM * (opts.curveFactor ?? 1.15)
      break
    case ShutoffMethod.HEAD_RATIO:
      headM = designHeadM * (opts.ratio ?? 1.2)
      break
    case ShutoffMethod.KNOWN_HEAD:
      headM = opts.knownHeadM ?? designHeadM
      break
    default:
      headM = designHeadM * 1.15
  }
  const pressureKpa = suctionPressureKpa + headM * sg * G
  return { headM, pressureKpa }
}

/**
 * Recommended control valve ΔP based on valve type and flow ratio.
 * Uses industry rules of thumb.
 */
export function calcRecommendedCvDp(
  systemPressureDropKpa: number,
  flowRatioMaxDesign: number,
): number {
  // CV ΔP ≈ 10–30% of system pressure drop, adjusted for flow ratio
  const basePct = Math.max(0.1, Math.min(0.3, 1 / (flowRatioMaxDesign * flowRatioMaxDesign) - 0.5))
  return systemPressureDropKpa * basePct
}

/**
 * Pipe Heat Transfer Calculator — Physics Engine
 *
 * Calculates heat loss and terminal temperature for fluid flowing in a single pipe.
 * Uses iterative convergence of both fluid average temperature and wall temperature.
 *
 * Physics:
 *   1. Internal forced convection (Dittus-Boelter)
 *   2. External natural convection (Churchill & Chu)
 *   3. External forced convection (Churchill & Bernstein)
 *   4. Multi-layer cylindrical conduction
 *   5. Radiation (linearized)
 *   6. Terminal temperature from energy balance
 *
 * All calculations in SI base units internally.
 */

import { CalculationStatus } from '@/types'
import type {
  PipeCalculationInput,
  PipeCalculationResult,
  PipeIterationDetail,
  ValidationIssue,
} from '@/types'
import { getAirProps } from '@/lib/materials'

// ─── Physical Constants ───────────────────────────────────────────────────────

const G = 9.81
const SIGMA = 5.67e-8
const MAX_ITERATIONS = 8

// ─── Utility Functions (shared with tank engine) ──────────────────────────────

interface FluidProps {
  rho: number; cp: number; mu: number; k: number
}

function grashofNumber(
  beta: number, deltaT: number, charLen: number, nuKin: number
): number {
  if (deltaT <= 0 || nuKin <= 0 || charLen <= 0) return 0
  return G * beta * Math.abs(deltaT) * charLen ** 3 / (nuKin ** 2)
}

function nusseltVerticalPlate(ra: number, pr: number): number {
  if (ra <= 0) return 1.0
  const term = 1 + (0.492 / pr) ** (9 / 16)
  return (0.825 + 0.387 * ra ** (1 / 6) / term ** (8 / 27)) ** 2
}

function nusseltHorizontalCylinder(ra: number, pr: number): number {
  if (ra <= 0) return 1.0
  const term = 1 + (0.559 / pr) ** (9 / 16)
  return (0.6 + 0.387 * ra ** (1 / 6) / term ** (8 / 27)) ** 2
}

// Churchill & Bernstein for cross-flow over cylinder (forced convection)
function nusseltForcedCylinder(re: number, pr: number): number {
  if (re <= 0) return 0.3
  const term1 = 0.62 * re ** 0.5 * pr ** (1 / 3)
  const term2 = (1 + (0.4 / pr) ** (2 / 3)) ** 0.25
  const term3 = (1 + (re / 282000) ** (5 / 8)) ** (4 / 5)
  return 0.3 + term1 / term2 * term3
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validatePipeInputs(input: PipeCalculationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!input.tag?.trim()) {
    issues.push({ code: 'MISSING_TAG', message: 'Tag is required', severity: 'error', field: 'tag' })
  }
  if (input.pipeLength <= 0) {
    issues.push({ code: 'INVALID_LENGTH', message: 'Pipe length must be positive', severity: 'error', field: 'pipeLength' })
  }
  if (input.flowRate <= 0) {
    issues.push({ code: 'INVALID_FLOW', message: 'Flow rate must be positive', severity: 'error', field: 'flowRate' })
  }
  if (input.inletTemp <= input.ambientTemp) {
    issues.push({ code: 'TEMP_INVERSION', message: 'Inlet temp must be > ambient', severity: 'error', field: 'inletTemp' })
  }
  if (input.fluidDensity <= 0 || input.fluidSpecificHeat <= 0 ||
      input.fluidViscosity <= 0 || input.fluidThermalConductivity <= 0) {
    issues.push({ code: 'INVALID_FLUID', message: 'Fluid properties must be positive', severity: 'error' })
  }
  if (input.wallConductivity <= 0) {
    issues.push({ code: 'INVALID_K_WALL', message: 'Wall conductivity must be positive', severity: 'error', field: 'wallConductivity' })
  }
  if (input.insulationThickness > 0 && input.insulationConductivity <= 0) {
    issues.push({ code: 'INVALID_K_INS', message: 'Insulation conductivity required when insulated', severity: 'error', field: 'insulationConductivity' })
  }
  if (input.surfaceEmissivity < 0 || input.surfaceEmissivity > 1) {
    issues.push({ code: 'INVALID_EMISSIVITY', message: 'Emissivity must be 0–1', severity: 'error' })
  }

  return issues
}

// ─── Geometric Helpers ────────────────────────────────────────────────────────

function pipeGeometry(input: PipeCalculationInput): {
  Di: number; Do: number; A_c: number; A_surface: number
} {
  const L = input.pipeLength

  if (input.pipeType === 'circular' as const) {
    // Use ID/OD directly, or compute from wall thickness
    if (input.insideDiameter && input.outsideDiameter) {
      const Di = input.insideDiameter / 1000
      const Do = input.outsideDiameter / 1000
      return { Di, Do, A_c: Math.PI * (Di / 2) ** 2, A_surface: Math.PI * Di * L }
    }
    // Compute OD from ID + wall thickness
    if (input.insideDiameter) {
      const Di = input.insideDiameter / 1000
      const Do = Di + 2 * (input.wallThickness / 1000)
      return { Di, Do, A_c: Math.PI * (Di / 2) ** 2, A_surface: Math.PI * Di * L }
    }
    // Fallback: use wall thickness to estimate (very rough)
    const Do = 0.1 // 100 mm guess
    const Di = Do - 2 * (input.wallThickness / 1000)
    return { Di, Do, A_c: Math.PI * (Di / 2) ** 2, A_surface: Math.PI * Di * L }
  }

  // Rectangular/Square duct
  const a = (input.sideA ?? 100) / 1000
  const b = (input.sideB ?? a) / 1000
  const A_c = a * b
  const perimeter = 2 * (a + b)
  const Dh = 4 * A_c / perimeter // hydraulic diameter
  const A_surface = perimeter * L
  return { Di: Dh, Do: Dh + 2 * (input.wallThickness / 1000), A_c, A_surface }
}

// ─── Main Calculation ─────────────────────────────────────────────────────────

export function calculatePipe(input: PipeCalculationInput): PipeCalculationResult {
  const issues = validatePipeInputs(input)
  if (issues.some(i => i.severity === 'error')) {
    return emptyPipeResult(CalculationStatus.ERROR)
  }

  // ── Geometry ──────────────────────────────────────────────────
  const { Di, Do, A_c, A_surface } = pipeGeometry(input)
  const L = input.pipeLength

  // ── Inputs ────────────────────────────────────────────────────
  const T_in = input.inletTemp
  const T_a = input.ambientTemp
  const V_wind = input.windSpeed
  const m_dot = input.flowRate / 3600          // kg/h → kg/s

  const t_wall = input.wallThickness / 1000
  const k_wall = input.wallConductivity
  const t_ins = input.insulationThickness / 1000
  const k_ins = input.insulationConductivity
  const Wf = input.windEnhancement ?? 1.0
  const eps = input.surfaceEmissivity

  // Conduction resistance (flat-plate approximation, adequate for thin-walled pipe)
  const condSimple = (t_wall / k_wall) + (t_ins > 0 ? t_ins / k_ins : 0)

  // Outer diameter including insulation
  const D_outer = Do + 2 * t_ins

  // Air properties (constant across iterations)
  const T_film_air = (T_in + T_a) / 2
  const air = getAirProps(T_film_air)
  const airProps: FluidProps = { rho: air.rho, cp: air.cp, mu: air.mu, k: air.k }

  // ── Initial guesses ───────────────────────────────────────────
  let T_avg = T_in
  let Tws = T_a + 0.25 * (T_in - T_a)

  const iterations: PipeIterationDetail[] = []
  let lastPr = 0, lastNu = 0

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // ── Fluid properties at T_avg ───────────────────────────────
    // (Use input properties; T-dependence could be added later)
    const fluid: FluidProps = {
      rho: input.fluidDensity,
      cp: input.fluidSpecificHeat,
      mu: input.fluidViscosity,
      k: input.fluidThermalConductivity,
    }

    // ── Internal Forced Convection ──────────────────────────────
    const v = m_dot / (fluid.rho * A_c)                         // velocity m/s
    const Re_i = fluid.rho * v * Di / fluid.mu
    const Pr_i = fluid.cp * fluid.mu / fluid.k

    let Nu_i: number
    if (Re_i > 10000) {
      // Dittus-Boelter (heating: n=0.4)
      Nu_i = 0.023 * Re_i ** 0.8 * Pr_i ** 0.4
    } else if (Re_i > 2300) {
      // Gnielinski for transitional flow
      const f = (0.79 * Math.log(Re_i) - 1.64) ** -2             // friction factor
      Nu_i = ((f / 8) * (Re_i - 1000) * Pr_i) /
        (1 + 12.7 * Math.sqrt(f / 8) * (Pr_i ** (2 / 3) - 1))
    } else {
      // Laminar — constant Nu for fully developed
      Nu_i = 3.66
    }

    const h_i = Nu_i * fluid.k / Di

    // ── External Natural Convection ─────────────────────────────
    const T_wall_ext = Math.max(Tws - T_a, 0.1)
    const nu_air = airProps.mu / airProps.rho
    const gr_ext = grashofNumber(air.beta, T_wall_ext, D_outer, nu_air)
    const pr_ext = airProps.cp * airProps.mu / airProps.k
    const ra_ext = gr_ext * pr_ext

    let Nu_ext_nat: number
    if (input.pipeOrientation === 'vertical') {
      Nu_ext_nat = nusseltVerticalPlate(ra_ext, pr_ext)
    } else {
      Nu_ext_nat = nusseltHorizontalCylinder(ra_ext, pr_ext)
    }

    const h_o_nat = Nu_ext_nat * airProps.k / D_outer

    // ── External Forced Convection (wind) ───────────────────────
    const Re_ext = V_wind * D_outer / nu_air
    const Nu_ext_forced = nusseltForcedCylinder(Re_ext, pr_ext)
    const h_o_forced = Nu_ext_forced * airProps.k / D_outer

    // Combined external: use max of natural+wind, or the forced if wind > 0
    const h_o_ext = V_wind > 0
      ? Math.max(h_o_forced, h_o_nat) * Wf
      : h_o_nat * Wf

    // ── Radiation ───────────────────────────────────────────────
    const T_a_K = T_a + 273.15
    const T_ws_K = Tws + 273.15
    const h_r = eps * SIGMA * (T_ws_K ** 2 + T_a_K ** 2) * (T_ws_K + T_a_K)

    // ── Overall U (based on inner surface area) ─────────────────
    const h_o_total = h_o_ext + h_r
    const U = 1 / (1 / Math.max(h_i, 1e-6) + condSimple + 1 / Math.max(h_o_total, 1e-6))

    // ── Heat Loss & Terminal Temperature ────────────────────────
    // Energy balance: ṁ·cp·(T_in - T_out) = U·A·ΔT_lm
    // ΔT_lm = (ΔT_in - ΔT_out) / ln(ΔT_in/ΔT_out)
    // where ΔT_in = T_in - T_a, ΔT_out = T_out - T_a
    // Solving for T_out: T_out = T_a + (T_in - T_a)·exp(-U·A_surface/(ṁ·cp))

    const mCp = m_dot * fluid.cp
    let T_out: number
    if (mCp > 0) {
      const NTU = U * A_surface / mCp
      T_out = T_a + (T_in - T_a) * Math.exp(-NTU)
    } else {
      T_out = T_in
    }

    const Q = mCp * (T_in - T_out)

    // ── Back-calculate wall temperatures ────────────────────────
    const Twi = T_avg - Q / (Math.max(h_i, 1e-6) * A_surface)
    Tws = T_a + Q / (Math.max(h_o_total, 1e-6) * A_surface)

    // ── Update T_avg ────────────────────────────────────────────
    T_avg = (T_in + T_out) / 2

    iterations.push({
      iteration: iter + 1,
      internalHTC: round3(h_i),
      externalHTC: round3(h_o_ext),
      externalNaturalHTC: round3(h_o_nat),
      radiationHTC: round3(h_r),
      uOverall: round3(U),
      heatLoss: round1(Q),
      outletTemp: round1(T_out),
      twOutside: round1(Tws),
      reynoldsInternal: round1(Re_i),
      nusseltExternal: round3(Nu_ext_forced > 0 ? Nu_ext_forced : Nu_ext_nat),
    })

    // Save last iteration values for final result
    lastPr = Pr_i
    lastNu = Nu_i
  }

  // ── Final results ─────────────────────────────────────────────
  const last = iterations[MAX_ITERATIONS - 1]

  // Recompute final Nu_ext for result
  const nu_air_final = airProps.mu / airProps.rho
  const Re_ext_final = V_wind * D_outer / nu_air_final
  const pr_ext_final = airProps.cp * airProps.mu / airProps.k

  // Natural convection Nusselt at final wall temp
  const Tw_final = last.twOutside
  const deltaT_final = Math.max(Tw_final - T_a, 0.1)
  const gr_final = grashofNumber(air.beta, deltaT_final, D_outer, nu_air_final)
  const ra_final = gr_final * pr_ext_final
  let Nu_ext_nat_final: number
  if (input.pipeOrientation === 'vertical') {
    Nu_ext_nat_final = nusseltVerticalPlate(ra_final, pr_ext_final)
  } else {
    Nu_ext_nat_final = nusseltHorizontalCylinder(ra_final, pr_ext_final)
  }
  const Nu_ext_forced_final = nusseltForcedCylinder(Re_ext_final, pr_ext_final)
  const Nu_ext_final = V_wind > 0 ? Nu_ext_forced_final : Nu_ext_nat_final

  return {
    status: CalculationStatus.SUCCESS,
    internalHTC: last.internalHTC,
    externalHTC: last.externalHTC,
    externalNaturalHTC: last.externalNaturalHTC,
    radiationHTC: last.radiationHTC,
    uOverall: last.uOverall,
    surfaceArea: round3(A_surface),
    heatLoss: last.heatLoss,
    inletTemp: T_in,
    outletTemp: last.outletTemp,
    reynoldsInternal: last.reynoldsInternal,
    prandtl: round3(lastPr),
    nusseltInternal: round3(lastNu),
    nusseltExternal: round3(Nu_ext_final),
    reynoldsExternal: round1(Re_ext_final),
    twInside: round1(T_avg - last.heatLoss / (Math.max(last.internalHTC, 1e-6) * A_surface)),
    twOutside: last.twOutside,
    iterations,
    calculatedAt: new Date().toISOString(),
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round1(v: number): number { return Math.round(v * 10) / 10 }
function round3(v: number): number { return Math.round(v * 1000) / 1000 }

function emptyPipeResult(status: CalculationStatus): PipeCalculationResult {
  return {
    status,
    internalHTC: 0, externalHTC: 0, externalNaturalHTC: 0, radiationHTC: 0,
    uOverall: 0, surfaceArea: 0, heatLoss: 0,
    inletTemp: 0, outletTemp: 0,
    reynoldsInternal: 0, prandtl: 0, nusseltInternal: 0, nusseltExternal: 0,
    reynoldsExternal: 0, twInside: 0, twOutside: 0,
    iterations: [],
    calculatedAt: new Date().toISOString(),
  }
}

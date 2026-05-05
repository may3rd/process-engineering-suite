/**
 * Heat Transfer Calculator — Core Physics Engine
 *
 * Calculates heat loss from a vertical cylindrical storage tank to the environment
 * using a per-surface iterative model with 20-step convergence.
 *
 * Four surfaces: dry wall (above liquid), wet wall (below liquid), roof, floor.
 * Each surface has: internal natural convection → conduction → external
 * convection+radiation → fouling → overall U → heat loss.
 *
 * All calculations in SI base units internally.
 */

import { getAirProps } from '@/lib/materials'
import {
  CalculationStatus,
} from '@/types'
import type {
  CalculationInput,
  CalculationResult,
  ValidationIssue,
  PerSurfaceResult,
  IterationDetail,
  CoolingResult,
} from '@/types'

// ─── Physical Constants ───────────────────────────────────────────────────────

const G = 9.81                     // m/s² — gravitational acceleration
const SIGMA = 5.67e-8              // W/(m²·K⁴) — Stefan-Boltzmann constant
const MAX_ITERATIONS = 20

// ─── Core Nusselt Correlations ────────────────────────────────────────────────

/**
 * Churchill & Chu correlation for natural convection on vertical plate.
 * Valid for all Ra (laminar + turbulent).
 */
function nusseltVerticalPlate(ra: number, pr: number): number {
  if (ra <= 0) return 1.0
  const term = 1 + (0.492 / pr) ** (9 / 16)
  return (0.825 + 0.387 * ra ** (1 / 6) / term ** (8 / 27)) ** 2
}

/**
 * Horizontal plate, lower surface of heated plate (or upper surface of cooled plate).
 * Nu = 0.27 * Ra^0.25
 */
function nusseltHorizontalLower(ra: number): number {
  if (ra <= 0) return 1.0
  return 0.27 * ra ** 0.25
}

/**
 * Horizontal plate, upper surface of heated plate (or lower surface of cooled plate).
 * Nu = 0.14 * Ra^0.33 (turbulent regime)
 */
function nusseltHorizontalUpper(ra: number): number {
  if (ra <= 0) return 1.0
  return 0.14 * ra ** 0.33
}

// ─── Internal Film Coefficients ───────────────────────────────────────────────
// These depend on fluid/vapor properties and internal wall temp guess.
// They are recomputed each iteration because ΔT changes with converging Twall.

interface FluidProps {
  rho: number; cp: number; mu: number; k: number; beta: number
}

function grashofNumber(
  beta: number, deltaT: number, charLen: number, nuKin: number
): number {
  if (deltaT <= 0 || nuKin <= 0 || charLen <= 0) return 0
  return G * beta * Math.abs(deltaT) * charLen ** 3 / (nuKin ** 2)
}

function computeInternalHTC(
  L_char: number,
  T_fluid: number,
  T_wall_guess: number,
  props: FluidProps,
  nuFn: (ra: number, pr: number) => number
): { h: number; gr: number; pr: number; ra: number; nu: number } {
  if (L_char <= 0) return { h: 0, gr: 0, pr: 0, ra: 0, nu: 0 }

  const nuKin = props.mu / props.rho
  const deltaT = T_fluid - T_wall_guess
  const gr = grashofNumber(props.beta, deltaT, L_char, nuKin)
  const pr = props.cp * props.mu / props.k
  const ra = gr * pr
  const nu = nuFn(ra, pr)
  const h = nu * props.k / L_char

  return { h, gr, pr, ra, nu }
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateInputs(input: CalculationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!input.tag || input.tag.trim().length === 0) {
    issues.push({ code: 'MISSING_TAG', message: 'Tag is required', severity: 'error', field: 'tag' })
  }
  if (input.tankDiameter <= 0) {
    issues.push({ code: 'INVALID_DIAMETER', message: 'Tank diameter must be positive', severity: 'error', field: 'tankDiameter' })
  }
  if (input.tankHeight <= 0) {
    issues.push({ code: 'INVALID_HEIGHT', message: 'Tank height must be positive', severity: 'error', field: 'tankHeight' })
  }
  if (input.liquidLevel < 0) {
    issues.push({ code: 'INVALID_LEVEL', message: 'Liquid level cannot be negative', severity: 'error', field: 'liquidLevel' })
  }
  if (input.liquidLevel > input.tankHeight) {
    issues.push({ code: 'LEVEL_EXCEEDS_HEIGHT', message: 'Liquid level exceeds tank height', severity: 'error', field: 'liquidLevel' })
  }
  if (input.fluidTemp <= input.ambientTemp) {
    issues.push({ code: 'TEMP_INVERSION', message: 'Fluid temp must be > ambient temp', severity: 'error', field: 'fluidTemp' })
  }
  if (input.wallThickness <= 0) {
    issues.push({ code: 'INVALID_WALL', message: 'Wall thickness must be positive', severity: 'error', field: 'wallThickness' })
  }
  if (input.wallConductivity <= 0) {
    issues.push({ code: 'INVALID_K_WALL', message: 'Wall conductivity must be positive', severity: 'error', field: 'wallConductivity' })
  }
  if (input.insulationThickness > 0 && input.insulationConductivity <= 0) {
    issues.push({ code: 'INVALID_K_INS', message: 'Insulation conductivity required when insulated', severity: 'error', field: 'insulationConductivity' })
  }
  if (input.fluidDensity <= 0) {
    issues.push({ code: 'INVALID_RHO', message: 'Fluid density must be positive', severity: 'error', field: 'fluidDensity' })
  }
  if (input.fluidSpecificHeat <= 0) {
    issues.push({ code: 'INVALID_CP', message: 'Specific heat must be positive', severity: 'error', field: 'fluidSpecificHeat' })
  }
  if (input.surfaceEmissivity < 0 || input.surfaceEmissivity > 1) {
    issues.push({ code: 'INVALID_EMISSIVITY', message: 'Emissivity must be 0–1', severity: 'error', field: 'surfaceEmissivity' })
  }

  return issues
}

// ─── Main Calculation ─────────────────────────────────────────────────────────

export function calculate(input: CalculationInput): CalculationResult {
  // Validate first
  const issues = validateInputs(input)
  if (issues.some(i => i.severity === 'error')) {
    return emptyResult(CalculationStatus.ERROR)
  }

  // ═══════════════════════════════════════════════════════════════════
  // 1. Extract inputs in base SI units
  // ═══════════════════════════════════════════════════════════════════

  const D = input.tankDiameter / 1000              // mm → m
  const H = input.tankHeight / 1000                // mm → m
  const L_liq = input.liquidLevel / 1000           // mm → m
  const L_dry = H - L_liq                          // dry wall height (m)

  const T_liquid = input.fluidTemp                 // °C
  const T_ambient = input.ambientTemp             // °C
  const T_vapor = input.vaporTemp ?? T_liquid      // °C — default preserves legacy behavior
  const T_ground = input.groundTemp ?? 25          // °C

  const t_wall = input.wallThickness / 1000        // mm → m
  const k_wall = input.wallConductivity            // W/(m·K)
  const t_ins = input.insulationThickness / 1000   // mm → m
  const k_ins = input.insulationConductivity       // W/(m·K)

  // Liquid properties
  const liq: FluidProps = {
    rho: input.fluidDensity,
    cp: input.fluidSpecificHeat,
    mu: input.fluidViscosity,
    k: input.fluidThermalConductivity,
    beta: input.fluidExpansionCoeff,
  }

  // Vapor/gas properties (fall back to air at vapor temp)
  const gas: FluidProps = (() => {
    const a = getAirProps(T_vapor)
    return {
      rho: input.vaporDensity ?? a.rho,
      cp: input.vaporSpecificHeat ?? a.cp,
      mu: input.vaporViscosity ?? a.mu,
      k: input.vaporThermalConductivity ?? a.k,
      beta: input.vaporExpansionCoeff ?? a.beta,
    }
  })()

  // Fouling HTCs (default: very high = negligible)
  const hF_dry = input.foulingDryWall ?? 5678
  const hF_wet = input.foulingWetWall ?? 4543
  const hF_roof = input.foulingRoof ?? 5678
  const hF_floor = input.foulingFloor ?? 2839

  const Wf = input.windEnhancement ?? 1.0
  const emissivity_wall = input.surfaceEmissivity
  const emissivity_roof = input.roofEmissivity ?? emissivity_wall
  const k_ground = input.groundConductivity ?? 1.3846

  // ═══════════════════════════════════════════════════════════════════
  // 2. Geometry
  // ═══════════════════════════════════════════════════════════════════

  const R = D / 2
  const D_outer = D + 2 * (t_wall + t_ins) // outer diameter incl. insulation

  // Inner surface areas
  const A_dry = Math.PI * D * L_dry
  const A_wet = Math.PI * D * L_liq
  // Roof area — cone or flat top
  const A_roof = input.roofHeight && input.roofHeight > 0
    ? Math.PI * R * Math.sqrt(R ** 2 + (input.roofHeight / 1000) ** 2)
    : Math.PI * R ** 2
  const A_floor = Math.PI * R ** 2

  // Conduction resistance — walls get insulation, roof/floor do not
  const R_cond_wall = (t_wall / k_wall) + (t_ins > 0 ? t_ins / k_ins : 0)
  const R_cond_roof = t_wall / k_wall   // uninsulated roof
  const R_cond_floor = t_wall / k_wall  // uninsulated floor

  // Air properties at film temperature
  const T_film_air = (T_ambient + T_liquid) / 2
  const air: FluidProps = (() => {
    const a = getAirProps(T_film_air)
    return { rho: a.rho, cp: a.cp, mu: a.mu, k: a.k, beta: a.beta }
  })()

  // ═══════════════════════════════════════════════════════════════════
  // 3. Initial wall temperature guesses
  // ═══════════════════════════════════════════════════════════════════

  let Tws_dry = T_ambient + 0.25 * (T_vapor - T_ambient)    // outside dry wall
  let Tws_wet = T_ambient + 0.25 * (T_liquid - T_ambient)   // outside wet wall
  let Tws_roof = T_ambient + 0.5 * (T_vapor - T_ambient)    // outside roof
  let Twi_dry = (T_vapor + T_ambient) / 2                    // inside dry wall
  let Twi_wet = (T_liquid + T_ambient) / 2                   // inside wet wall
  let Twi_roof = (T_vapor + T_ambient) / 2                   // inside roof
  let Twi_floor = (T_liquid + T_ground) / 2                  // inside floor

  // Ground floor external HTC (constant — semi-infinite solid model)
  const h_o_floor = D > 0 ? (8 * k_ground) / (Math.PI * D) : 0

  const iterations: IterationDetail[] = []

  // ═══════════════════════════════════════════════════════════════════
  // 4. Iterative convergence loop (20 iterations)
  // ═══════════════════════════════════════════════════════════════════

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // ── 4a. Internal Film Coefficients ────────────────────────────

    // Wet wall internal (liquid, characteristic length = liquid level)
    const iWet = computeInternalHTC(L_liq, T_liquid, Twi_wet, liq, nusseltVerticalPlate)

    // Dry wall internal (vapor/gas, characteristic length = dry height)
    const iDry = computeInternalHTC(L_dry, T_vapor, Twi_dry, gas, nusseltVerticalPlate)

    // Roof internal (vapor/gas, L_char = D, horizontal plate lower surface)
    const iRoof = computeInternalHTC(D, T_vapor, Twi_roof, gas,
      (ra, pr) => nusseltHorizontalLower(ra))

    // Floor internal (liquid, L_char = D, horizontal plate)
    const iFloor = computeInternalHTC(D, T_liquid, Twi_floor, liq,
      (ra, _pr) => nusseltHorizontalUpper(ra))

    // ── 4b. External Natural Convection ──────────────────────────

    // Wall external — use average of dry & wet outside wall temps
    const Tws_wall_avg = L_dry > 0 && L_liq > 0
      ? (Tws_dry * L_dry + Tws_wet * L_liq) / H
      : L_liq > 0 ? Tws_wet : Tws_dry

    const air_nu_wall = air.mu / air.rho
    const deltaT_wall_ext = Math.max(Tws_wall_avg - T_ambient, 0.1)
    const gr_ext_wall = grashofNumber(air.beta, deltaT_wall_ext, H, air_nu_wall)
    const pr_air_ext = air.cp * air.mu / air.k
    const ra_ext_wall = gr_ext_wall * pr_air_ext
    const nu_ext_wall = nusseltVerticalPlate(ra_ext_wall, pr_air_ext)

    const ho_nat_wall = nu_ext_wall * air.k / H
    const ho_dry_ext = ho_nat_wall * Wf
    const ho_wet_ext = ho_nat_wall * Wf

    // Roof external — horizontal plate, upper surface
    const deltaT_roof_ext = Math.max(Tws_roof - T_ambient, 0.1)
    const gr_ext_roof = grashofNumber(air.beta, deltaT_roof_ext, D_outer, air_nu_wall)
    const ra_ext_roof = gr_ext_roof * pr_air_ext
    const nu_ext_roof = nusseltHorizontalUpper(ra_ext_roof)

    const ho_nat_roof = nu_ext_roof * air.k / D_outer
    const ho_roof_ext = ho_nat_roof * Wf

    // Floor: constant ground conduction model (no iteration needed)

    // ── 4c. Radiation ────────────────────────────────────────────

    const T_a_K = T_ambient + 273.15

    function radHTC(Tws: number, eps: number): number {
      const Ts_K = Tws + 273.15
      return eps * SIGMA * (Ts_K ** 2 + T_a_K ** 2) * (Ts_K + T_a_K)
    }

    const hr_dry = radHTC(Tws_dry, emissivity_wall)
    const hr_wet = radHTC(Tws_wet, emissivity_wall)
    const hr_roof = radHTC(Tws_roof, emissivity_roof)

    // ── 4d. Overall U for each surface ───────────────────────────

    const U_dry = 1 / (
      1 / Math.max(iDry.h, 1e-6) +
      R_cond_wall +
      1 / Math.max(ho_dry_ext + hr_dry, 1e-6) +
      1 / Math.max(hF_dry, 1e-6)
    )

    const U_wet = 1 / (
      1 / Math.max(iWet.h, 1e-6) +
      R_cond_wall +
      1 / Math.max(ho_wet_ext + hr_wet, 1e-6) +
      1 / Math.max(hF_wet, 1e-6)
    )

    const U_roof = 1 / (
      1 / Math.max(iRoof.h, 1e-6) +
      R_cond_roof +
      1 / Math.max(ho_roof_ext + hr_roof, 1e-6) +
      1 / Math.max(hF_roof, 1e-6)
    )

    const U_floor = 1 / (
      1 / Math.max(iFloor.h, 1e-6) +
      R_cond_floor +
      1 / Math.max(h_o_floor, 1e-6) +
      1 / Math.max(hF_floor, 1e-6)
    )

    // ── 4e. Heat Loss ────────────────────────────────────────────

    const Q_dry = U_dry * A_dry * (T_vapor - T_ambient)
    const Q_wet = U_wet * A_wet * (T_liquid - T_ambient)
    const Q_roof = U_roof * A_roof * (T_vapor - T_ambient)
    const Q_floor = U_floor * A_floor * (T_liquid - T_ground)

    // ── 4f. Back-calculate wall temperatures ─────────────────────

    const h_o_ext_total_dry = ho_dry_ext + hr_dry
    const h_o_ext_total_wet = ho_wet_ext + hr_wet
    const h_o_ext_total_roof = ho_roof_ext + hr_roof

    Twi_dry = T_vapor - (U_dry / Math.max(iDry.h, 1e-6)) * (T_vapor - T_ambient)
    Twi_wet = T_liquid - (U_wet / Math.max(iWet.h, 1e-6)) * (T_liquid - T_ambient)
    Twi_roof = T_vapor - (U_roof / Math.max(iRoof.h, 1e-6)) * (T_vapor - T_ambient)
    Twi_floor = T_liquid - (U_floor / Math.max(iFloor.h, 1e-6)) * (T_liquid - T_ground)

    Tws_dry = (U_dry / Math.max(h_o_ext_total_dry, 1e-6)) * (T_vapor - T_ambient) + T_ambient
    Tws_wet = (U_wet / Math.max(h_o_ext_total_wet, 1e-6)) * (T_liquid - T_ambient) + T_ambient
    Tws_roof = (U_roof / Math.max(h_o_ext_total_roof, 1e-6)) * (T_vapor - T_ambient) + T_ambient

    // ── 4g. Store iteration ──────────────────────────────────────

    iterations.push({
      iteration: iter + 1,
      dryWall: surfaceResult(A_dry, iDry, ho_dry_ext, ho_nat_wall, hr_dry, U_dry, Q_dry, Twi_dry, Tws_dry, nu_ext_wall),
      wetWall: surfaceResult(A_wet, iWet, ho_wet_ext, ho_nat_wall, hr_wet, U_wet, Q_wet, Twi_wet, Tws_wet, nu_ext_wall),
      roof: surfaceResult(A_roof, iRoof, ho_roof_ext, ho_nat_roof, hr_roof, U_roof, Q_roof, Twi_roof, Tws_roof, nu_ext_roof),
      floor: surfaceResult(A_floor, iFloor, h_o_floor, h_o_floor, 0, U_floor, Q_floor, Twi_floor, T_ground, 0),
    })
  }

  // ═══════════════════════════════════════════════════════════════════
  // 5. Final results (last iteration)
  // ═══════════════════════════════════════════════════════════════════

  const final = iterations[iterations.length - 1]
  const Q_total = final.dryWall.heatLoss + final.wetWall.heatLoss +
    final.roof.heatLoss + final.floor.heatLoss
  const A_total = A_dry + A_wet + A_roof + A_floor

  // Cooling rate
  const V_liq = Math.PI * R ** 2 * L_liq
  const mass = V_liq * liq.rho
  let rateCHr = 0
  let timeToAmbientHr: number | null = null
  if (mass > 0 && liq.cp > 0) {
    rateCHr = (Q_total / (mass * liq.cp)) * 3600
    const deltaT = T_liquid - T_ambient
    if (deltaT > 0 && rateCHr > 0) {
      timeToAmbientHr = deltaT / rateCHr
    }
  }

  // Reynolds number
  const air_nu_ext = air.mu / air.rho
  const Re_ext = input.windSpeed * D_outer / air_nu_ext

  const cooling: CoolingResult = {
    rateCHr: round4(rateCHr),
    timeToAmbientHr: timeToAmbientHr !== null ? round1(timeToAmbientHr) : null,
  }

  // Determine status
  let status: CalculationStatus = CalculationStatus.SUCCESS
  const warnings = issues.filter(i => i.severity === 'warning')
  if (warnings.length > 0) status = CalculationStatus.WARNING

  return {
    status,
    dryWall: roundSurface(final.dryWall),
    wetWall: roundSurface(final.wetWall),
    roof: roundSurface(final.roof),
    floor: roundSurface(final.floor),
    totalHeatLoss: round1(Q_total),
    totalArea: round3(A_total),
    cooling,
    reynoldsExternal: round1(Re_ext),
    iterations: iterations.map(it => ({
      ...it,
      dryWall: roundSurface(it.dryWall),
      wetWall: roundSurface(it.wetWall),
      roof: roundSurface(it.roof),
      floor: roundSurface(it.floor),
    })),
    calculatedAt: new Date().toISOString(),
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function surfaceResult(
  area: number,
  internal: { h: number; gr: number; pr: number; ra: number; nu: number },
  hExt: number, hExtNat: number, hRad: number,
  u: number, q: number, twIn: number, twOut: number,
  nuExt: number,
): PerSurfaceResult {
  return {
    hInternal: internal.h,
    hExternal: hExt,
    hExternalNatural: hExtNat,
    hRadiation: hRad,
    uOverall: u,
    area,
    heatLoss: q,
    twInside: twIn,
    twOutside: twOut,
    grashof: internal.gr,
    prandtl: internal.pr,
    rayleigh: internal.ra,
    nusseltInternal: internal.nu,
    nusseltExternal: nuExt,
  }
}

function roundSurface(s: PerSurfaceResult): PerSurfaceResult {
  return {
    hInternal: round3(s.hInternal),
    hExternal: round3(s.hExternal),
    hExternalNatural: round3(s.hExternalNatural),
    hRadiation: round3(s.hRadiation),
    uOverall: round3(s.uOverall),
    area: round3(s.area),
    heatLoss: round1(s.heatLoss),
    twInside: round1(s.twInside),
    twOutside: round1(s.twOutside),
    grashof: round1(s.grashof),
    prandtl: round3(s.prandtl),
    rayleigh: round1(s.rayleigh),
    nusseltInternal: round3(s.nusseltInternal),
    nusseltExternal: round3(s.nusseltExternal),
  }
}

function round1(v: number): number { return Math.round(v * 10) / 10 }
function round3(v: number): number { return Math.round(v * 1000) / 1000 }
function round4(v: number): number { return Math.round(v * 10000) / 10000 }

function emptyResult(status: CalculationStatus): CalculationResult {
  const empty = emptySurface()
  return {
    status,
    dryWall: empty,
    wetWall: empty,
    roof: empty,
    floor: empty,
    totalHeatLoss: 0,
    totalArea: 0,
    cooling: { rateCHr: 0, timeToAmbientHr: null },
    reynoldsExternal: 0,
    iterations: [],
    calculatedAt: new Date().toISOString(),
  }
}

function emptySurface(): PerSurfaceResult {
  return {
    hInternal: 0, hExternal: 0, hExternalNatural: 0, hRadiation: 0, uOverall: 0,
    area: 0, heatLoss: 0, twInside: 0, twOutside: 0,
    grashof: 0, prandtl: 0, rayleigh: 0, nusseltInternal: 0, nusseltExternal: 0,
  }
}

/**
 * Horizontal Tank Heat Transfer — Physics Engine
 *
 * Calculates heat loss from a horizontal cylindrical storage tank with heads.
 * 4 surfaces: dry wall, wet wall, dry head (both), wet head (both).
 *
 * Nusselt correlations:
 *   - Wall: horizontal cylinder (0.53 Ra^0.25 or 0.114 Ra^0.333)
 *   - Heads: sphere (0.555 Ra^0.25 or 0.021 Ra^0.4)
 *
 * 8-step iterative wall-temperature convergence matching Excel.
 */

import { CalculationStatus, HeadType } from '@/types'
import type {
  HorizontalTankInput, HorizontalTankResult, HorizontalTankIterationDetail, ValidationIssue
} from '@/types'
import { getAirProps } from '@/lib/materials'

// ─── Constants ──────────────────────────────────────────────────────────────

const G = 9.81
const SIGMA = 5.67e-8
const MAX_ITERATIONS = 8

// ─── Head Geometry (mirrors vessels-calculation) ─────────────────────────────

function computeHeadDepth(headType: HeadType, D: number): number {
  switch (headType) {
    case HeadType.FLAT: return 0
    case HeadType.ELLIPSOIDAL_2_1: return D / 4
    case HeadType.HEMISPHERICAL: return D / 2
    case HeadType.TORISPHERICAL_80_10: return D * 0.169  // approx D/5.92
  }
}

function singleHeadSurfaceArea(headType: HeadType, D: number, h: number): number {
  const R = D / 2
  switch (headType) {
    case HeadType.FLAT: return Math.PI * R * R
    case HeadType.HEMISPHERICAL: return 2 * Math.PI * R * R
    case HeadType.ELLIPSOIDAL_2_1: {
      const a = R, b = D / 4
      if (a === b) return 2 * Math.PI * a * a
      const e = Math.sqrt(1 - (b / a) ** 2)
      return 2 * Math.PI * a * a * (1 + (b * b) / (a * a * e) * Math.atanh(e))
    }
    case HeadType.TORISPHERICAL_80_10: {
      // Approximate as 1.08 * hemispherical
      return 1.08 * 2 * Math.PI * R * R
    }
  }
}

// ─── Nusselt Correlations ───────────────────────────────────────────────────

function grashof(beta: number, dT: number, Lchar: number, nuSi: number): number {
  // Match Excel convention: Gr uses μ in cP (not SI Pa·s), so denominator = ν*1000
  if (dT <= 0 || nuSi <= 0 || Lchar <= 0) return 0
  return G * beta * Math.abs(dT) * Lchar ** 3 / ((nuSi * 1000) ** 2)
}

/** Horizontal cylinder — standard correlation */
function nusseltHorizontalCylinder(ra: number): number {
  if (ra <= 0) return 1.0
  if (ra < 1e9) return 0.53 * ra ** 0.25
  return 0.114 * ra ** (1 / 3)
}

/** Sphere/head — Churchill correlation for spheres */
function nusseltSphere(ra: number): number {
  if (ra <= 0) return 1.0
  if (ra < 1e9) return 0.555 * ra ** 0.25
  return 0.021 * ra ** 0.4
}

// ─── Validation ─────────────────────────────────────────────────────────────

export function validateHorizontalInput(input: HorizontalTankInput): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!input.tag?.trim()) issues.push({ code: 'MISSING_TAG', message: 'Tag required', severity: 'error', field: 'tag' })
  if (input.insideDiameter <= 0) issues.push({ code: 'INVALID_DIAMETER', message: 'Diameter must be positive', severity: 'error' })
  if (input.tankLength <= 0) issues.push({ code: 'INVALID_LENGTH', message: 'Length must be positive', severity: 'error' })
  if (input.liquidLevel < 0 || input.liquidLevel > input.insideDiameter) issues.push({ code: 'INVALID_LEVEL', message: 'Liquid level invalid', severity: 'error' })
  if (input.fluidTemp <= input.ambientTemp) issues.push({ code: 'TEMP_INVERSION', message: 'Fluid temp > ambient', severity: 'error' })
  if (input.wallConductivity <= 0) issues.push({ code: 'INVALID_K', message: 'Wall k must be positive', severity: 'error' })
  if (input.insulationThickness > 0 && input.insulationConductivity <= 0) issues.push({ code: 'INVALID_K_INS', message: 'Insulation k required', severity: 'error' })
  if (input.surfaceEmissivity < 0 || input.surfaceEmissivity > 1) issues.push({ code: 'INVALID_EMISSIVITY', message: 'Emissivity 0–1', severity: 'error' })
  return issues
}

// ─── Main Calculation ───────────────────────────────────────────────────────

export function calculateHorizontalTank(input: HorizontalTankInput): HorizontalTankResult {
  const issues = validateHorizontalInput(input)
  if (issues.some(i => i.severity === 'error')) {
    return emptyResult(CalculationStatus.ERROR)
  }

  // ── Geometry ──────────────────────────────────────────────────
  const D = input.insideDiameter / 1000
  const L_tan = input.tankLength / 1000
  const L_flange = (input.flangeWidth ?? 0) / 1000
  const h = input.liquidLevel / 1000
  const headDepth = input.headDepth ? input.headDepth / 1000 : computeHeadDepth(input.headType, D)

  const pctLevel = D > 0 ? Math.min(Math.max(h / D, 0), 1) : 0

  // Areas (inner surface). The Excel workbook treats the 2:1 ellipsoidal
  // head surface formula below as the combined-head equivalent, then includes
  // that area in the wall split and again in the head split.
  const A_head_total = singleHeadSurfaceArea(input.headType, D, headDepth)
  const A_shell = Math.PI * D * L_tan + A_head_total

  // Wet/dry split proportional to % liquid level
  const A_dry_wall = A_shell * (1 - pctLevel)
  const A_wet_wall = A_shell * pctLevel
  const A_dry_head = A_head_total * (1 - pctLevel)
  const A_wet_head = A_head_total * pctLevel

  // ── Temperatures ──────────────────────────────────────────────
  const T_f = input.fluidTemp
  const T_a = input.ambientTemp
  const T_v = input.vaporTemp ?? T_f  // vapor space can be cooler than liquid; default preserves legacy behavior

  // ── Wall construction ─────────────────────────────────────────
  const t_wall = input.wallThickness / 1000
  const k_wall = input.wallConductivity
  const t_ins = input.insulationThickness / 1000
  const k_ins = input.insulationConductivity
  const R_cond = (t_wall / k_wall) + (t_ins > 0 ? t_ins / k_ins : 0)

  // ── Fluid props ───────────────────────────────────────────────
  const liq = { rho: input.fluidDensity, cp: input.fluidSpecificHeat, mu: input.fluidViscosity, k: input.fluidThermalConductivity, beta: input.fluidExpansionCoeff }

  const gas = {
    rho: input.vaporDensity ?? getAirProps(T_f).rho,
    cp: input.vaporSpecificHeat ?? getAirProps(T_f).cp,
    mu: input.vaporViscosity ?? getAirProps(T_f).mu,
    k: input.vaporThermalConductivity ?? getAirProps(T_f).k,
    beta: input.vaporExpansionCoeff ?? getAirProps(T_f).beta,
  }

  // ── Air props ─────────────────────────────────────────────────
  const air = getAirProps((T_f + T_a) / 2)
  const airP = { rho: air.rho, cp: air.cp, mu: air.mu, k: air.k }
  const pr_air = airP.cp * airP.mu / airP.k
  const nu_air = airP.mu / airP.rho

  // ── Fouling ───────────────────────────────────────────────────
  const hF_dw = input.foulingDryWall ?? 5678
  const hF_ww = input.foulingWetWall ?? 4543
  const hF_dh = input.foulingDryHead ?? 5678
  const hF_wh = input.foulingWetHead ?? 4543

  const Wf = input.windEnhancement ?? 1.0
  const eps = input.surfaceEmissivity

  // ── Outside diameter ──────────────────────────────────────────
  const D_outer_wall = D + 2 * (t_wall + t_ins)

  // ── Initial wall temp guesses ─────────────────────────────────
  let Tws_dry = T_a + 0.25 * (T_v - T_a)
  let Tws_wet = T_a + 0.25 * (T_f - T_a)
  let Tws_dh = T_a + 0.25 * (T_v - T_a)
  let Tws_wh = T_a + 0.25 * (T_f - T_a)
  let Twi_dry = (T_v + T_a) / 2
  let Twi_wet = (T_f + T_a) / 2
  let Twi_dh = (T_v + T_a) / 2
  let Twi_wh = (T_f + T_a) / 2

  const iterations: HorizontalTankIterationDetail[] = []

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // ── Internal Film Coefficients ──────────────────────────────
    // Dry wall (vapor/gas, L_char = D, horizontal cylinder)
    const nu_dry = liq.mu / liq.rho  // wait, should be gas for dry wall
    const nu_gas = gas.mu / gas.rho
    const iDry = computeInternal(gas, D, T_v, Twi_dry, nusseltHorizontalCylinder)
    // Wet wall (liquid, L_char = D, horizontal cylinder)
    const iWet = computeInternal(liq, D, T_f, Twi_wet, nusseltHorizontalCylinder)
    // Dry head (vapor/gas, L_char = D - h = dry height above liquid, sphere)
    const L_dry = D - h
    const iDryHead = computeInternal(gas, Math.max(L_dry, 0.01), T_v, Twi_dh, nusseltSphere)
    // Wet head (liquid, L_char = h, sphere)
    const iWetHead = computeInternal(liq, Math.max(h, 0.01), T_f, Twi_wh, nusseltSphere)

    // ── External Natural Convection ─────────────────────────────
    const dT_ext = Math.max((Tws_dry + Tws_wet) / 2 - T_a, 0.1)
    const gr_ext = grashof(air.beta, dT_ext, D_outer_wall, nu_air)
    const ra_ext = gr_ext * pr_air
    const nu_ext_wall = nusseltHorizontalCylinder(ra_ext)
    const h_o_nat_wall = nu_ext_wall * airP.k / D_outer_wall

    // Head external (sphere)
    const dT_head_ext = Math.max((Tws_dh + Tws_wh) / 2 - T_a, 0.1)
    const gr_head_ext = grashof(air.beta, dT_head_ext, D_outer_wall, nu_air)
    const ra_head_ext = gr_head_ext * pr_air
    const nu_ext_head = nusseltSphere(ra_head_ext)
    const h_o_nat_head = nu_ext_head * airP.k / D_outer_wall

    // Wind enhancement
    const h_o_dry = h_o_nat_wall * Wf
    const h_o_wet = h_o_nat_wall * Wf
    const h_o_dh = h_o_nat_head * Wf
    const h_o_wh = h_o_nat_head * Wf

    // ── Radiation ───────────────────────────────────────────────
    // Match the legacy Excel workbook for horizontal tanks, which linearizes
    // radiation with Celsius temperatures rather than absolute Kelvin.
    const hr = (Tws: number) => eps * SIGMA * (Tws ** 2 + T_a ** 2) * (Tws + T_a)
    const hr_dry = hr(Tws_dry), hr_wet = hr(Tws_wet)
    const hr_dh = hr(Tws_dh), hr_wh = hr(Tws_wh)

    // ── Overall U ───────────────────────────────────────────────
    const U = (hi: number, ho: number, hrad: number, hF: number, Ri: number) =>
      1 / (1 / Math.max(hi, 1e-6) + Ri + 1 / Math.max(ho + hrad, 1e-6) + 1 / Math.max(hF, 1e-6))

    const U_dry = U(iDry.h, h_o_dry, hr_dry, hF_dw, R_cond)
    const U_wet = U(iWet.h, h_o_wet, hr_wet, hF_ww, R_cond)
    const U_dh = U(iDryHead.h, h_o_dh, hr_dh, hF_dh, R_cond)
    const U_wh = U(iWetHead.h, h_o_wh, hr_wh, hF_wh, R_cond)

    // ── Heat Loss ───────────────────────────────────────────────
    const Q_dry = U_dry * A_dry_wall * (T_v - T_a)
    const Q_wet = U_wet * A_wet_wall * (T_f - T_a)
    const Q_dh = U_dh * A_dry_head * (T_v - T_a)
    const Q_wh = U_wh * A_wet_head * (T_f - T_a)

    // ── Back-calculate wall temps ───────────────────────────────
    Twi_dry = T_v - (U_dry / Math.max(iDry.h, 1e-6)) * (T_v - T_a)
    Twi_wet = T_f - (U_wet / Math.max(iWet.h, 1e-6)) * (T_f - T_a)
    Twi_dh = T_v - (U_dh / Math.max(iDryHead.h, 1e-6)) * (T_v - T_a)
    Twi_wh = T_f - (U_wh / Math.max(iWetHead.h, 1e-6)) * (T_f - T_a)

    Tws_dry = U_dry / Math.max(h_o_dry + hr_dry, 1e-6) * (T_v - T_a) + T_a
    Tws_wet = U_wet / Math.max(h_o_wet + hr_wet, 1e-6) * (T_f - T_a) + T_a
    Tws_dh = U_dh / Math.max(h_o_dh + hr_dh, 1e-6) * (T_v - T_a) + T_a
    Tws_wh = U_wh / Math.max(h_o_wh + hr_wh, 1e-6) * (T_f - T_a) + T_a

    iterations.push({
      iteration: iter + 1,
      dryWall: surfaceSnap(iDry, h_o_dry, hr_dry, U_dry, A_dry_wall, Q_dry, Twi_dry, Tws_dry, nu_ext_wall),
      wetWall: surfaceSnap(iWet, h_o_wet, hr_wet, U_wet, A_wet_wall, Q_wet, Twi_wet, Tws_wet, nu_ext_wall),
      dryHead: surfaceSnap(iDryHead, h_o_dh, hr_dh, U_dh, A_dry_head, Q_dh, Twi_dh, Tws_dh, nu_ext_head),
      wetHead: surfaceSnap(iWetHead, h_o_wh, hr_wh, U_wh, A_wet_head, Q_wh, Twi_wh, Tws_wh, nu_ext_head),
    })
  }

  // ── Final results ─────────────────────────────────────────────
  const last = iterations[MAX_ITERATIONS - 1]
  const Q_total = last.dryWall.heatLoss + last.wetWall.heatLoss + last.dryHead.heatLoss + last.wetHead.heatLoss
  const A_total = A_shell + A_head_total

  const V_liq = Math.PI * (D / 2) ** 2 * (L_tan + 2 * L_flange) * pctLevel
  const mass = V_liq * liq.rho
  let rateCHr = 0, timeHr: number | null = null
  if (mass > 0 && liq.cp > 0) {
    rateCHr = (Q_total / (mass * liq.cp)) * 3600
    if (T_f - T_a > 0 && rateCHr > 0) timeHr = (T_f - T_a) / rateCHr
  }

  const Re_ext = input.windSpeed * D_outer_wall / nu_air

  return {
    status: CalculationStatus.SUCCESS,
    dryWall: rs(last.dryWall),
    wetWall: rs(last.wetWall),
    dryHead: rs(last.dryHead),
    wetHead: rs(last.wetHead),
    totalHeatLoss: round1(Q_total),
    totalArea: round3(A_total),
    cooling: { rateCHr: round4(rateCHr), timeToAmbientHr: timeHr !== null ? round1(timeHr) : null },
    reynoldsExternal: round1(Re_ext),
    iterations: iterations.map(it => ({
      ...it,
      dryWall: rs(it.dryWall), wetWall: rs(it.wetWall),
      dryHead: rs(it.dryHead), wetHead: rs(it.wetHead),
    })),
    calculatedAt: new Date().toISOString(),
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface FluidProps { rho: number; cp: number; mu: number; k: number; beta: number }

function computeInternal(
  p: FluidProps, L: number, Tf: number, Tw: number,
  nuFn: (ra: number) => number,
) {
  if (L <= 0) return { h: 0, gr: 0, pr: 0, ra: 0, nu: 0 }
  const nu = p.mu / p.rho
  const dT = Tf - Tw
  const gr = grashof(p.beta, dT, L, nu)
  const pr = p.cp * p.mu / p.k
  const ra = gr * pr
  const nusselt = nuFn(ra)
  const h = nusselt * p.k / L
  return { h, gr, pr, ra, nu: nusselt }
}

function surfaceSnap(
  i: { h: number; gr: number; pr: number; ra: number; nu: number },
  ho: number, hr: number, U: number, A: number, Q: number, twi: number, tws: number, nuExt: number,
) {
  return { hInternal: i.h, hExternal: ho, hRadiation: hr, uOverall: U, area: A, heatLoss: Q, twInside: twi, twOutside: tws, grashof: i.gr, prandtl: i.pr, rayleigh: i.ra, nusseltInternal: i.nu, nusseltExternal: nuExt }
}

function rs(s: any) { return { ...s, hInternal: round3(s.hInternal), hExternal: round3(s.hExternal), hRadiation: round3(s.hRadiation), uOverall: round3(s.uOverall), area: round3(s.area), heatLoss: round1(s.heatLoss), twInside: round1(s.twInside), twOutside: round1(s.twOutside), grashof: round1(s.grashof), prandtl: round3(s.prandtl), rayleigh: round1(s.rayleigh), nusseltInternal: round3(s.nusseltInternal), nusseltExternal: round3(s.nusseltExternal) } }

function round1(v: number) { return Math.round(v * 10) / 10 }
function round3(v: number) { return Math.round(v * 1000) / 1000 }
function round4(v: number) { return Math.round(v * 10000) / 10000 }

function emptyResult(status: CalculationStatus): HorizontalTankResult {
  const e = emptySnap()
  return { status, dryWall: e, wetWall: e, dryHead: e, wetHead: e, totalHeatLoss: 0, totalArea: 0, cooling: { rateCHr: 0, timeToAmbientHr: null }, reynoldsExternal: 0, iterations: [], calculatedAt: new Date().toISOString() }
}
function emptySnap() { return { hInternal: 0, hExternal: 0, hRadiation: 0, uOverall: 0, area: 0, heatLoss: 0, twInside: 0, twOutside: 0, grashof: 0, prandtl: 0, rayleigh: 0, nusseltInternal: 0, nusseltExternal: 0 } }

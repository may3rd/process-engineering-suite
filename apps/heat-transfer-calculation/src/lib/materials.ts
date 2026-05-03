/**
 * Material property data for heat transfer calculations.
 *
 * Air properties: Cengel Table A-15, interpolated at 5°C intervals.
 * Materials: sourced from Neutrium, BuyInsulationProducts, yumpu.
 */

// ─── Air Property Table (Cengel A-15) ────────────────────────────────────────

interface AirRow {
  tempC: number
  rho: number    // kg/m³ — density
  mu: number     // kg/(m·s) — dynamic viscosity
  cp: number     // J/(kg·K) — specific heat
  k: number      // W/(m·K) — thermal conductivity
  beta: number   // 1/K — thermal expansion coefficient
}

const AIR_TABLE: AirRow[] = [
  { tempC: 0,   rho: 1.292,  mu: 1.729e-5, cp: 1007, k: 0.02364, beta: 0.00369 },
  { tempC: 5,   rho: 1.269,  mu: 1.754e-5, cp: 1006, k: 0.02401, beta: 0.00362 },
  { tempC: 10,  rho: 1.246,  mu: 1.778e-5, cp: 1006, k: 0.02439, beta: 0.00356 },
  { tempC: 15,  rho: 1.225,  mu: 1.802e-5, cp: 1006, k: 0.02476, beta: 0.00350 },
  { tempC: 20,  rho: 1.204,  mu: 1.825e-5, cp: 1007, k: 0.02514, beta: 0.00343 },
  { tempC: 25,  rho: 1.184,  mu: 1.849e-5, cp: 1007, k: 0.02551, beta: 0.00338 },
  { tempC: 30,  rho: 1.164,  mu: 1.872e-5, cp: 1007, k: 0.02588, beta: 0.00332 },
  { tempC: 35,  rho: 1.145,  mu: 1.895e-5, cp: 1007, k: 0.02625, beta: 0.00321 },
  { tempC: 40,  rho: 1.127,  mu: 1.918e-5, cp: 1007, k: 0.02662, beta: 0.00321 },
  { tempC: 45,  rho: 1.109,  mu: 1.941e-5, cp: 1007, k: 0.02699, beta: 0.00321 },
  { tempC: 50,  rho: 1.092,  mu: 1.963e-5, cp: 1007, k: 0.02735, beta: 0.00312 },
  { tempC: 60,  rho: 1.059,  mu: 2.008e-5, cp: 1007, k: 0.02808, beta: 0.00302 },
  { tempC: 70,  rho: 1.028,  mu: 2.052e-5, cp: 1007, k: 0.02881, beta: 0.00285 },
  { tempC: 80,  rho: 0.9994, mu: 2.096e-5, cp: 1008, k: 0.02953, beta: 0.00285 },
  { tempC: 90,  rho: 0.9718, mu: 2.139e-5, cp: 1008, k: 0.03024, beta: 0.00285 },
  { tempC: 100, rho: 0.9458, mu: 2.181e-5, cp: 1009, k: 0.03095, beta: 0.00270 },
]

function lerp(x0: number, y0: number, x1: number, y1: number, x: number): number {
  if (x0 === x1) return y0
  return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
}

/** Interpolate air properties at any temperature 0–100°C. Clamps to table bounds. */
export function getAirProps(tempC: number): AirRow {
  const t = Math.max(0, Math.min(100, tempC))

  // Find bracketing rows
  let i = 0
  while (i < AIR_TABLE.length - 1 && AIR_TABLE[i + 1].tempC <= t) i++

  if (i >= AIR_TABLE.length - 1) return AIR_TABLE[AIR_TABLE.length - 1]

  const lo = AIR_TABLE[i]
  const hi = AIR_TABLE[i + 1]

  return {
    tempC: t,
    rho: lerp(lo.tempC, lo.rho, hi.tempC, hi.rho, t),
    mu: lerp(lo.tempC, lo.mu, hi.tempC, hi.mu, t),
    cp: lerp(lo.tempC, lo.cp, hi.tempC, hi.cp, t),
    k: lerp(lo.tempC, lo.k, hi.tempC, hi.k, t),
    beta: lerp(lo.tempC, lo.beta, hi.tempC, hi.beta, t),
  }
}

// ─── Material Presets ─────────────────────────────────────────────────────────

export interface WallMaterial {
  name: string
  k: number        // W/(m·K) — thermal conductivity
  emissivity: number
}

export interface InsulationMaterial {
  name: string
  k: number        // W/(m·K)
}

export interface GroundMaterial {
  name: string
  k: number        // W/(m·K)
}

export const WALL_MATERIALS: WallMaterial[] = [
  { name: "Carbon Steel", k: 45.3, emissivity: 0.12 },
  { name: "Stainless Steel 304", k: 14, emissivity: 0.6 },
  { name: "Stainless Steel 316", k: 13.9, emissivity: 0.6 },
  { name: "Copper", k: 401, emissivity: 0.025 },
  { name: "Aluminum", k: 225, emissivity: 0.04 },
  { name: "Brass", k: 144, emissivity: 0.03 },
  { name: "Custom", k: 0, emissivity: 0.85 },
]

export const INSULATION_MATERIALS: InsulationMaterial[] = [
  { name: "None", k: 0 },
  { name: "Mineral Wool", k: 0.035 },
  { name: "Glass Wool", k: 0.043 },
  { name: "Fiberglass", k: 0.05 },
  { name: "Custom", k: 0 },
]

export const GROUND_MATERIALS: GroundMaterial[] = [
  { name: "Concrete", k: 1.3846 },
  { name: "Custom", k: 0 },
]

// ─── Pipe Schedule Data (ASME B36.10) ────────────────────────────────────────

export interface PipeSize {
  nps: string          // e.g. "1/2", "3/4", "1", "1½", "2", ...
  od: number           // mm — outside diameter
  schedules: PipeSchedule[]
}

export interface PipeSchedule {
  name: string          // "SCH 40", "SCH 80", "STD"
  wallThickness: number // mm
  id: number            // mm — inside diameter
}

export const PIPE_SIZES: PipeSize[] = [
  { nps: "½",   od: 21.3,  schedules: [
    { name: "SCH 40", wallThickness: 2.77, id: 15.8 },
    { name: "SCH 80", wallThickness: 3.73, id: 13.8 },
  ]},
  { nps: "¾",   od: 26.7,  schedules: [
    { name: "SCH 40", wallThickness: 2.87, id: 20.9 },
    { name: "SCH 80", wallThickness: 3.91, id: 18.9 },
  ]},
  { nps: "1",    od: 33.4,  schedules: [
    { name: "SCH 40", wallThickness: 3.38, id: 26.6 },
    { name: "SCH 80", wallThickness: 4.55, id: 24.3 },
  ]},
  { nps: "1¼",   od: 42.2,  schedules: [
    { name: "SCH 40", wallThickness: 3.56, id: 35.1 },
    { name: "SCH 80", wallThickness: 4.85, id: 32.5 },
  ]},
  { nps: "1½",   od: 48.3,  schedules: [
    { name: "SCH 40", wallThickness: 3.68, id: 40.9 },
    { name: "SCH 80", wallThickness: 5.08, id: 38.1 },
  ]},
  { nps: "2",    od: 60.3,  schedules: [
    { name: "SCH 40", wallThickness: 3.91, id: 52.5 },
    { name: "SCH 80", wallThickness: 5.54, id: 49.3 },
  ]},
  { nps: "2½",   od: 73.0,  schedules: [
    { name: "SCH 40", wallThickness: 5.16, id: 62.7 },
    { name: "SCH 80", wallThickness: 7.01, id: 59.0 },
  ]},
  { nps: "3",    od: 88.9,  schedules: [
    { name: "SCH 40", wallThickness: 5.49, id: 77.9 },
    { name: "SCH 80", wallThickness: 7.62, id: 73.7 },
  ]},
  { nps: "4",    od: 114.3, schedules: [
    { name: "SCH 40", wallThickness: 6.02, id: 102.3 },
    { name: "SCH 80", wallThickness: 8.56, id: 97.2 },
  ]},
  { nps: "5",    od: 141.3, schedules: [
    { name: "SCH 40", wallThickness: 6.55, id: 128.2 },
    { name: "SCH 80", wallThickness: 9.53, id: 122.3 },
  ]},
  { nps: "6",    od: 168.3, schedules: [
    { name: "SCH 40", wallThickness: 7.11, id: 154.1 },
    { name: "SCH 80", wallThickness: 10.97, id: 146.3 },
  ]},
  { nps: "8",    od: 219.1, schedules: [
    { name: "SCH 40", wallThickness: 8.18, id: 202.7 },
    { name: "SCH 80", wallThickness: 12.70, id: 193.7 },
  ]},
  { nps: "10",   od: 273.0, schedules: [
    { name: "SCH 40", wallThickness: 9.27, id: 254.5 },
    { name: "SCH 80", wallThickness: 15.09, id: 242.8 },
  ]},
  { nps: "12",   od: 323.8, schedules: [
    { name: "SCH 40", wallThickness: 10.31, id: 303.2 },
    { name: "SCH 80", wallThickness: 17.48, id: 288.9 },
  ]},
]

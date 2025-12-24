/**
 * PSV Orifice Sizing Calculations per API-520/521
 *
 * Shared sizing utilities for PSV applications.
 */

import { convertUnit } from '@eng-suite/physics';
import { ORIFICE_SIZES, SizingInputs, SizingMethod, SizingOutputs } from './types';
import { calculateKsh, APIEdition } from './kshLookup';

/** Default discharge coefficient for gas/vapor PRV (API-520) */
export const DEFAULT_KD_GAS = 0.975;

/** Default discharge coefficient for liquid PRV (API-520) */
export const DEFAULT_KD_LIQUID = 0.65;

/** Combination correction factor - no rupture disk */
export const DEFAULT_KC = 1.0;

/** Combination correction factor - with rupture disk (uncertified) */
export const DEFAULT_KC_WITH_RD = 0.9;

/** Default C coefficient when k is unknown */
export const DEFAULT_C = 315;

/** Gas constant R in appropriate units */
export const R_GAS = 8.314; // J/(mol·K)

/** Convert temperature from °C to Kelvin */
export function celsiusToKelvin(tempC: number): number {
    return convertUnit(tempC, 'C', 'K');
}

/** Convert temperature from °C to Rankine */
export function celsiusToRankine(tempC: number): number {
    return convertUnit(tempC, 'C', 'R');
}

/** Convert pressure from barg to bara */
export function bargToBara(barg: number): number {
    return convertUnit(barg, 'barg', 'bar');
}

/** Convert pressure from barg to psia */
export function bargToPsia(barg: number): number {
    return convertUnit(barg, 'barg', 'psi');
}

export function bargToPsig(barg: number): number {
    return convertUnit(barg, 'barg', 'psig');
}

/** Convert mass flow from kg/h to lb/h */
export function kghToLbh(kgh: number): number {
    return convertUnit(kgh, 'kg/h', 'lb/h');
}

/** Convert area from in² to mm² */
export function sqinToSqmm(sqin: number): number {
    return convertUnit(sqin, 'in2', 'mm2');
}

/** Convert area from mm² to in² */
export function sqmmToSqin(sqmm: number): number {
    return convertUnit(sqmm, 'mm2', 'in2');
}

/**
 * Calculate the C coefficient from specific heat ratio (k = Cp/Cv)
 */
export function calculateC(k: number): number {
    if (k <= 1) return DEFAULT_C;
    const term = Math.pow(2 / (k + 1), (k + 1) / (k - 1));
    return 520 * Math.sqrt(k * term);
}

/**
 * Critical flow pressure ratio
 */
export function calculateCriticalPressureRatio(k: number): number {
    if (k <= 1) return 0.5; // Default fallback
    return Math.pow(2 / (k + 1), k / (k - 1));
}

/**
 * Critical flow pressure
 */
export function calculateCriticalFlowPressure(P1: number, k: number): number {
    return P1 * calculateCriticalPressureRatio(k);
}

export function isCriticalFlow(P2: number, Pcf: number): boolean {
    return P2 <= Pcf;
}

/**
 * Calculate F2 factor for subcritical gas flow
 */
export function calculateF2(k: number, r: number): number {
    if (k <= 1 || r <= 0 || r >= 1) return 1;

    const term1 = k / (k - 1);
    const term2 = Math.pow(r, 2 / k);
    const term3 = (1 - Math.pow(r, (k - 1) / k)) / (1 - r);

    return Math.sqrt(term1 * term2 * term3);
}

/**
 * Calculate backpressure correction factor Kb for balanced bellows valves
 */
export function calculateKb(backpressureRatio: number, valveType: 'conventional' | 'balanced' | 'pilot' = 'conventional'): number {
    if (valveType === 'conventional' || valveType === 'pilot') {
        return 1.0;
    }

    if (backpressureRatio <= 0.3) return 1.0;
    if (backpressureRatio >= 0.5) return 0.7;

    return 1.0 - (backpressureRatio - 0.3) * 1.5;
}

/**
 * Kw lookup table based on API-520 Figure 32
 * For balanced bellows valves in liquid service
 * X: Percent of Gauge Backpressure = (PB/PS) × 100
 * Y: Kw correction factor
 */
const KW_LIQUID_TABLE: { percent: number; kw: number }[] = [
    { percent: 0, kw: 1.0 },
    { percent: 5, kw: 1.0 },
    { percent: 10, kw: 1.0 },
    { percent: 15, kw: 1.0 },
    { percent: 16, kw: 0.995 },
    { percent: 20, kw: 0.97 },
    { percent: 25, kw: 0.92 },
    { percent: 30, kw: 0.865 },
    { percent: 35, kw: 0.795 },
    { percent: 40, kw: 0.71 },
    { percent: 45, kw: 0.60 },
    { percent: 50, kw: 0.50 },
];

/**
 * Calculate backpressure correction factor Kw for liquid service (API-520 Figure 32)
 * 
 * @param backpressureGauge - Backpressure in gauge units (e.g., barg, psig)
 * @param setPressureGauge - Set pressure in same gauge units
 * @param valveType - Valve operating type
 * @returns Kw correction factor (1.0 for conventional/pilot, interpolated for balanced bellows)
 * 
 * NOTE: For conventional valves, backpressure does not affect liquid flow capacity,
 * so Kw = 1.0. For balanced bellows valves, use Figure 32 curve.
 */
export function calculateKw(
    backpressureGauge: number,
    setPressureGauge: number,
    valveType: 'conventional' | 'balanced' | 'pilot' = 'conventional'
): number {
    console.log('calculateKw');
    console.log('backpressureGauge', backpressureGauge);
    console.log('setPressureGauge', setPressureGauge);
    console.log('valveType', valveType);

    // Conventional and pilot valves: Kw = 1.0 (no correction needed)
    if (valveType === 'conventional' || valveType === 'pilot') {
        return 1.0;
    }

    // Calculate percent of gauge backpressure
    if (setPressureGauge <= 0) return 1.0;
    const percentBackpressure = (backpressureGauge / setPressureGauge) * 100;
    console.log('percentBackpressure', percentBackpressure);

    // Clamp to table bounds
    if (percentBackpressure <= 15) return 1.0;
    if (percentBackpressure >= 50) return 0.5;

    // Linear interpolation within table
    for (let i = 0; i < KW_LIQUID_TABLE.length - 1; i++) {
        const lower = KW_LIQUID_TABLE[i];
        const upper = KW_LIQUID_TABLE[i + 1];
        if (percentBackpressure >= lower.percent && percentBackpressure <= upper.percent) {
            const t = (percentBackpressure - lower.percent) / (upper.percent - lower.percent);
            const Kw = lower.kw + t * (upper.kw - lower.kw);
            console.log('Kw', Kw);
            return Kw;
        }
    }

    return 1.0; // Fallback
}

/**
 * Calculate viscosity correction factor Kv for liquid service
 */
export function calculateKv(Re: number): number {
    if (Re > 16000) return 1.0;
    if (Re <= 0) return 0.1; // Minimum fallback

    const term1 = 0.9935;
    const term2 = 2.878 / Math.sqrt(Re);
    const term3 = 342.75 / Math.pow(Re, 1.5);

    return 1 / (term1 + term2 + term3);
}

/**
 * Calculate Reynolds number for liquid flow through orifice
 */
export function calculateReynoldsNumber(Q: number, G: number, A: number, mu: number): number {
    if (A <= 0 || mu <= 0) return 100000; // Default to non-viscous
    return (Q * G * 2800) / (A * mu);
}

export interface SizingResult {
    requiredArea: number;        // mm²
    requiredAreaIn2: number;     // in²
    isCriticalFlow: boolean;
    C: number;
    Kd: number;
    Kb: number;
    Kc: number;
    Kv?: number;                 // Liquid only
    messages: string[];
}

/**
 * Calculate required orifice area for gas/vapor service (API-520)
 */
export function calculateGasArea(inputs: SizingInputs): SizingResult {
    const messages: string[] = [];

    // Convert units to API-520 standard (US units)
    const W = kghToLbh(inputs.massFlowRate);          // lb/h
    const P1 = bargToPsia(inputs.pressure);           // psia
    const P2 = bargToPsia(inputs.backpressure);       // psia
    const T = celsiusToRankine(inputs.temperature);   // °R
    const M = inputs.molecularWeight;
    const Z = inputs.compressibilityZ;
    const k = inputs.specificHeatRatio;

    // Calculate coefficients
    const C = calculateC(k);
    const Kd = inputs.dischargeCoefficient ?? DEFAULT_KD_GAS;
    const Kc = DEFAULT_KC;
    const Kb = inputs.backpressureCorrectionFactor ?? calculateKb(P2 / P1, 'conventional');

    // Determine flow regime
    const Pcf = calculateCriticalFlowPressure(P1, k);
    const critical = isCriticalFlow(P2, Pcf);

    let A_in2: number;

    if (critical) {
        console.log('Critical flow conditions');
    } else {
        console.log('Subcritical flow conditions');
    }
    console.log('W', W);
    console.log('C', C);
    console.log('Kd', Kd);
    console.log('P1', P1);
    console.log('P2', P2);
    console.log('Kb', Kb);
    console.log('Kc', Kc);
    console.log('T', T);
    console.log('Z', Z);
    console.log('M', M);

    if (critical) {
        // Critical flow equation
        A_in2 = (W / (C * Kd * P1 * Kb * Kc)) * Math.sqrt((T * Z) / M);
        messages.push('Critical (choked) flow conditions');
    } else {
        // Subcritical flow equation
        const r = P2 / P1;
        const F2 = calculateF2(k, r);
        console.log('r', r);
        console.log('F2', F2);
        A_in2 = (W / (735 * F2 * Kd * Kb * Kc)) * Math.sqrt((T * Z) / (M * P1 * (P1 - P2)));
        messages.push('Subcritical flow conditions');
        messages.push(`Pressure ratio P2/P1 = ${(r * 100).toFixed(1)}%`);
    }

    return {
        requiredArea: sqinToSqmm(A_in2),
        requiredAreaIn2: A_in2,
        isCriticalFlow: critical,
        C,
        Kd,
        Kb,
        Kc,
        messages,
    };
}

/**
 * Calculate required orifice area for liquid service (API-520)
 */
export function calculateLiquidArea(inputs: SizingInputs): SizingResult {
    const messages: string[] = [];

    // Convert units
    const P1 = bargToPsia(inputs.pressure);
    const P2 = bargToPsia(inputs.backpressure);
    const deltaP = P1 - P2;

    if (deltaP <= 0) {
        messages.push('ERROR: Backpressure must be less than relieving pressure');
        return {
            requiredArea: 0,
            requiredAreaIn2: 0,
            isCriticalFlow: false,
            C: 0,
            Kd: DEFAULT_KD_LIQUID,
            Kb: 1.0,
            Kc: DEFAULT_KC,
            Kv: 1.0,
            messages,
        };
    }

    // Use density to get specific gravity (relative to water at 60°F = 999 kg/m³)
    const density = inputs.density || inputs.liquidDensity || 1000; // kg/m³
    const G = density / 999;

    // Convert mass flow to volumetric flow (gpm)
    // Q (gpm) = W (kg/h) / (density (kg/m³) × 0.2271)
    const Q = inputs.massFlowRate / (density * 0.2271);

    const Kd = inputs.dischargeCoefficient ?? DEFAULT_KD_LIQUID;

    // Calculate Kw based on valve type and backpressure ratio (API-520 Figure 32)
    // Use set pressure if provided, otherwise use relieving pressure as approximation
    const setPressure = bargToPsig(inputs.setPressure ?? inputs.pressure);
    const backpressure = bargToPsig(inputs.backpressure);
    const valveType = inputs.valveType ?? 'conventional';

    console.log('backpressure', backpressure);
    console.log('setPressure', setPressure);
    console.log('valveType', valveType);

    const Kw = calculateKw(backpressure, setPressure, valveType);

    if (valveType === 'balanced' && Kw < 1.0) {
        messages.push(`Balanced bellows valve: Kw = ${Kw.toFixed(3)} (BP/PS = ${((backpressure / setPressure) * 100).toFixed(1)}%)`);
    }

    const Kc = DEFAULT_KC;
    let Kv = 1.0; // Initial viscosity correction

    console.log('Q', Q);
    console.log('Kd', Kd);
    console.log('Kw', Kw);
    console.log('Kc', Kc);
    console.log('Kv', Kv);
    console.log('G', G);
    console.log('P1', P1);
    console.log('P2', P2);
    console.log('deltaP', deltaP);

    // First pass - calculate preliminary area with Kv = 1.0
    let A_in2 = (Q / (38 * Kd * Kw * Kc * Kv)) * Math.sqrt(G / deltaP);

    console.log('A_in2', A_in2);

    // Calculate viscosity correction if viscosity is provided
    const viscosity = inputs.viscosity ?? inputs.liquidViscosity;
    if (viscosity && viscosity > 0) {
        // Find next larger standard orifice
        const preliminaryOrifice = ORIFICE_SIZES.find(o => o.areaIn2 >= A_in2);
        if (preliminaryOrifice) {
            const Re = calculateReynoldsNumber(Q, G, preliminaryOrifice.areaIn2, viscosity);
            Kv = calculateKv(Re);

            if (Kv < 1.0) {
                messages.push(`Viscosity correction applied: Kv = ${Kv.toFixed(3)}`);
                messages.push(`Reynolds number: ${Re.toFixed(0)}`);

                // Recalculate with viscosity correction
                A_in2 = (Q / (38 * Kd * Kw * Kc * Kv)) * Math.sqrt(G / deltaP);
            }
        }
    }

    console.log('Viscosity', viscosity);
    console.log('Kv', Kv);
    console.log('A_in2', A_in2);

    messages.push('Liquid service sizing per API-520');

    return {
        requiredArea: sqinToSqmm(A_in2),
        requiredAreaIn2: A_in2,
        isCriticalFlow: false,
        C: 0,
        Kd,
        Kb: Kw,
        Kc,
        Kv,
        messages,
    };
}

/**
 * Calculate required orifice area for steam service (API-520)
 */
export function calculateSteamArea(inputs: SizingInputs, edition: APIEdition = '10E'): SizingResult {
    const messages: string[] = [];

    const W = kghToLbh(inputs.massFlowRate);
    const P1_psia = bargToPsia(inputs.pressure);
    const P2 = bargToPsia(inputs.backpressure);

    // Convert pressure to Pa absolute for Ksh lookup
    const P1_Pa = convertUnit(inputs.pressure, 'barg', 'Pa');
    // Convert temperature to K for Ksh lookup
    const T1_K = celsiusToKelvin(inputs.temperature);

    const Kd = inputs.dischargeCoefficient ?? DEFAULT_KD_GAS;
    const Kb = inputs.backpressureCorrectionFactor ?? calculateKb(P2 / P1_psia, 'conventional');
    const Kc = DEFAULT_KC;
    let Kn = 1.0; // Napier correction (for P1 > 1500 psia)
    let Ksh = 1.0; // Superheat correction (1.0 for saturated steam)

    // Calculate Napier correction
    if (P1_psia <= 1500) {
        messages.push('Napier correction: Kn = 1.0 (P1 ≤ 1500 psia)');
    } else {
        Kn = (0.1906 * P1_psia - 1000) / (0.2292 * P1_psia - 1061);
        messages.push(`Napier correction applied: Kn = ${Kn.toFixed(3)}`);
    }

    // Calculate superheat correction (Ksh)
    // Ksh < 1.0 for superheated steam, = 1.0 for saturated steam
    try {
        Ksh = calculateKsh(T1_K, P1_Pa, edition);
        if (Ksh < 1.0) {
            messages.push(`Superheated steam: Ksh = ${Ksh.toFixed(3)} (API-520 ${edition})`);
        } else {
            messages.push('Saturated steam conditions (Ksh = 1.0)');
        }
    } catch (error) {
        // If Ksh calculation fails (e.g., out of range), default to 1.0
        Ksh = 1.0;
        messages.push('Steam sizing assuming saturated conditions (Ksh = 1.0)');
        if (error instanceof Error) {
            messages.push(`NOTE: ${error.message}`);
        }
    }

    console.log('W', W);
    console.log('Kd', Kd);
    console.log('P1_psia', P1_psia);
    console.log('T1_K', T1_K);
    console.log('Kb', Kb);
    console.log('Kc', Kc);
    console.log('Kn', Kn);
    console.log('Ksh', Ksh);

    const A_in2 = W / (51.5 * Kd * P1_psia * Kb * Kc * Kn * Ksh);

    return {
        requiredArea: sqinToSqmm(A_in2),
        requiredAreaIn2: A_in2,
        isCriticalFlow: true, // Steam typically critical
        C: 0,
        Kd,
        Kb,
        Kc,
        messages,
    };
}

/**
 * Calculate required orifice area based on sizing method
 */
export function calculateSizing(inputs: SizingInputs, method: SizingMethod): SizingOutputs {
    let result: SizingResult;

    switch (method) {
        case 'gas':
            result = calculateGasArea(inputs);
            break;
        case 'liquid':
            result = calculateLiquidArea(inputs);
            break;
        case 'steam':
            result = calculateSteamArea(inputs);
            break;
        case 'two_phase': {
            const gasResult = calculateGasArea(inputs);
            const liquidResult = calculateLiquidArea(inputs);
            result = gasResult.requiredArea > liquidResult.requiredArea ? gasResult : liquidResult;
            result.messages.push('Two-phase sizing: using more conservative of gas/liquid');
            break;
        }
        default:
            result = calculateGasArea(inputs);
    }

    // Select orifice
    const requiredArea = result.requiredArea;
    let selectedOrifice = ORIFICE_SIZES[ORIFICE_SIZES.length - 1]; // Default to largest

    for (const orifice of ORIFICE_SIZES) {
        if (orifice.area >= requiredArea) {
            selectedOrifice = orifice;
            break;
        }
    }

    const percentUsed = (requiredArea / selectedOrifice.area) * 100;

    // Calculate rated capacity (reverse calculation)
    const ratedCapacity = inputs.massFlowRate / (percentUsed / 100);

    if (percentUsed > 100) {
        result.messages.push(`WARNING: Required area exceeds largest standard orifice (T)`);
    } else if (percentUsed > 90) {
        result.messages.push(`NOTE: High orifice utilization (${percentUsed.toFixed(1)}%)`);
    }

    return {
        requiredArea: Math.round(requiredArea),
        requiredAreaIn2: result.requiredAreaIn2,
        selectedOrifice: selectedOrifice.designation,
        orificeArea: selectedOrifice.area,
        percentUsed: Math.round(percentUsed * 10) / 10,
        ratedCapacity: Math.round(ratedCapacity),
        dischargeCoefficient: result.Kd,
        backpressureCorrectionFactor: result.Kb,
        isCriticalFlow: result.isCriticalFlow,
        numberOfValves: 1, // Default, can be adjusted by user in UI
        messages: result.messages,
    };
}

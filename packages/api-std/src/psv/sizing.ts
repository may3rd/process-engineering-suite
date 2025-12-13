/**
 * PSV Orifice Sizing Calculations per API-520/521
 *
 * Shared sizing utilities for PSV applications.
 */

import { convertUnit } from '@eng-suite/physics';
import { ORIFICE_SIZES, SizingInputs, SizingMethod, SizingOutputs } from './types';

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
        // Critical flow equation
        A_in2 = (W / (C * Kd * P1 * Kb * Kc)) * Math.sqrt((T * Z) / M);
        messages.push('Critical (choked) flow conditions');
    } else {
        // Subcritical flow equation
        const r = P2 / P1;
        const F2 = calculateF2(k, r);
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
    const Kw = inputs.backpressureCorrectionFactor ?? 1.0; // Backpressure correction for balanced valves (assume conventional)
    const Kc = DEFAULT_KC;
    let Kv = 1.0; // Initial viscosity correction

    // First pass - calculate preliminary area with Kv = 1.0
    let A_in2 = (Q / (38 * Kd * Kw * Kc * Kv)) * Math.sqrt(G / deltaP);

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
export function calculateSteamArea(inputs: SizingInputs): SizingResult {
    const messages: string[] = [];

    const W = kghToLbh(inputs.massFlowRate);
    const P1 = bargToPsia(inputs.pressure);
    const P2 = bargToPsia(inputs.backpressure);

    const Kd = inputs.dischargeCoefficient ?? DEFAULT_KD_GAS;
    const Kb = inputs.backpressureCorrectionFactor ?? calculateKb(P2 / P1, 'conventional');
    const Kc = DEFAULT_KC;
    const Kn = 1.0; // Napier correction (for P1 > 1500 psia)
    const Ksh = 1.0; // Superheat correction (1.0 for saturated steam)

    messages.push('Steam sizing assuming saturated conditions (Ksh = 1.0)');

    const A_in2 = W / (51.5 * Kd * P1 * Kb * Kc * Kn * Ksh);

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

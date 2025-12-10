/**
 * Hydraulic Validation Module for PSV Sizing
 * 
 * Provides functions to:
 * 1. Calculate total pressure drop through inlet/outlet piping networks
 * 2. Validate inlet pressure drop against API 520 3% guideline
 * 3. Determine built-up backpressure from outlet network
 */

import { PipelineNetwork, PipeProps } from '@/data/types';

export interface FluidProperties {
    phase: 'gas' | 'liquid' | 'steam' | 'two_phase';
    temperature: number; // °C
    pressure: number; // barg
    density?: number; // kg/m³
    viscosity?: number; // cP
    molecularWeight?: number; // g/mol
    compressibilityZ?: number;
}

export interface HydraulicResult {
    totalPressureDrop: number; // kPa
    velocityMax: number; // m/s
    pipes: {
        id: string;
        pressureDrop: number; // kPa
        velocity: number; // m/s
    }[];
}

export interface InletValidation {
    isValid: boolean;
    percentOfSetPressure: number;
    message: string;
    severity: 'success' | 'warning' | 'error';
}

/**
 * Calculate total pressure drop through a piping network
 * 
 * @param network - Pipeline network (inlet or outlet)
 * @param flowRate - Mass flow rate in kg/h
 * @param fluid - Fluid properties at relieving conditions
 * @returns Hydraulic calculation results
 */
export function calculateNetworkPressureDrop(
    network: PipelineNetwork | undefined,
    flowRate: number,
    fluid: FluidProperties
): HydraulicResult {
    if (!network || !network.pipes || network.pipes.length === 0) {
        return {
            totalPressureDrop: 0,
            velocityMax: 0,
            pipes: [],
        };
    }

    const results: HydraulicResult['pipes'] = [];
    let totalDeltaP = 0;
    let maxVelocity = 0;

    for (const pipe of network.pipes) {
        // Use existing pressure drop calculation if available
        const pressureDrop = pipe.pressureDropCalculationResults?.totalSegmentPressureDrop ||
            calculatePipePressureDrop(pipe, flowRate, fluid);
        const velocity = calculateVelocity(pipe, flowRate, fluid.density || 1000);

        results.push({
            id: pipe.id,
            pressureDrop,
            velocity,
        });

        totalDeltaP += pressureDrop;
        maxVelocity = Math.max(maxVelocity, velocity);
    }

    return {
        totalPressureDrop: totalDeltaP,
        velocityMax: maxVelocity,
        pipes: results,
    };
}

/**
 * Calculate pressure drop for a single pipe segment
 * Simplified calculation - uses Darcy-Weisbach for liquid, ideal gas for gas
 * 
 * @param pipe - Pipe properties
 * @param flowRate - Mass flow rate in kg/h
 * @param fluid - Fluid properties
 * @returns Pressure drop in kPa
 */
function calculatePipePressureDrop(
    pipe: PipeProps,
    flowRate: number,
    fluid: FluidProperties
): number {
    // Convert flow rate to kg/s
    const massFlowRateKgS = flowRate / 3600;

    // Get diameter (preferring pipeDiameter, falling back to diameter, then default)
    const diameterInches = pipe.pipeDiameter || pipe.diameter || 3;
    const diameterM = (diameterInches * 25.4 / 1000); // Convert inches to meters
    const area = Math.PI * Math.pow(diameterM / 2, 2);

    // Calculate velocity
    const density = fluid.density || 1000; // Default to water if not provided
    const velocity = massFlowRateKgS / (density * area);

    // Simplified friction factor (Haaland approximation)
    const roughness = pipe.roughness || 0.045; // mm, default to commercial steel
    const roughnessM = roughness / 1000;
    const reynolds = calculateReynolds(velocity, diameterM, density, fluid.viscosity || 1);
    const frictionFactor = calculateFrictionFactor(reynolds, roughnessM / diameterM);

    // Darcy-Weisbach equation: ΔP = f * (L/D) * (ρ * v²/2)
    const length = pipe.length || 10; // Default to 10m if not provided
    const frictionalDrop = frictionFactor * (length / diameterM) * (density * Math.pow(velocity, 2) / 2);

    // Add fitting losses (K-factor method)
    const fittingDrop = calculateFittingLosses(pipe, density, velocity);

    // Add elevation head (ΔP = ρ * g * Δh)
    const elevationChange = pipe.elevation || 0;
    const elevationDrop = density * 9.81 * elevationChange;

    // Total pressure drop in Pa, convert to kPa
    const totalDrop = (frictionalDrop + fittingDrop + elevationDrop) / 1000;

    return Math.max(0, totalDrop); // Ensure non-negative
}

/**
 * Calculate velocity in pipe
 */
function calculateVelocity(pipe: PipeProps, flowRate: number, density: number): number {
    const massFlowRateKgS = flowRate / 3600;
    const diameterInches = pipe.pipeDiameter || pipe.diameter || 3;
    const diameterM = (diameterInches * 25.4 / 1000);
    const area = Math.PI * Math.pow(diameterM / 2, 2);
    return massFlowRateKgS / (density * area);
}

/**
 * Convert nominal diameter to actual inner diameter in meters
 * @deprecated - Now using direct diameter from PipeProps
 */
function convertDiameterToMeters(nominalInches: number, schedule: string): number {
    // Kept for backward compatibility but not used
    return (nominalInches * 25.4 / 1000) * 0.90;
}

/**
 * Calculate Reynolds number
 */
function calculateReynolds(velocity: number, diameter: number, density: number, viscosity: number): number {
    // viscosity in cP, convert to Pa·s
    const viscosityPas = viscosity / 1000;
    return (density * velocity * diameter) / viscosityPas;
}

/**
 * Calculate friction factor using Haaland approximation
 */
function calculateFrictionFactor(reynolds: number, relativeRoughness: number): number {
    if (reynolds < 2300) {
        // Laminar flow
        return 64 / reynolds;
    } else {
        // Turbulent flow - Haaland approximation
        const term1 = Math.pow(relativeRoughness / 3.7, 1.11);
        const term2 = 6.9 / reynolds;
        return Math.pow(-1.8 * Math.log10(term1 + term2), -2);
    }
}

/**
 * Calculate fitting losses using K-factor method
 */
function calculateFittingLosses(pipe: PipeProps, density: number, velocity: number): number {
    const kFactor = pipe.totalK || 0;
    return kFactor * (density * Math.pow(velocity, 2) / 2);
}

/**
 * Validate inlet pressure drop against API 520 3% guideline
 * 
 * @param inletDeltaP - Inlet pressure drop in kPa
 * @param setPressure - PSV set pressure in barg
 * @returns Validation result with message
 */
export function validateInletPressureDrop(
    inletDeltaP: number,
    setPressure: number
): InletValidation {
    // Convert set pressure from barg to kPa (absolute)
    const setPressureKpa = (setPressure + 1.01325) * 100; // barg to bara, then to kPa

    // Calculate percentage
    const percent = (inletDeltaP / setPressureKpa) * 100;

    // API 520 guideline: < 3% recommended
    if (percent <= 3) {
        return {
            isValid: true,
            percentOfSetPressure: percent,
            message: `Inlet pressure drop is ${percent.toFixed(1)}% of set pressure. Complies with API 520 guideline (< 3%).`,
            severity: 'success',
        };
    } else if (percent <= 5) {
        return {
            isValid: false,
            percentOfSetPressure: percent,
            message: `Inlet pressure drop is ${percent.toFixed(1)}% of set pressure. Exceeds API 520 guideline (< 3%) but within acceptable range. Consider reducing inlet piping pressure drop.`,
            severity: 'warning',
        };
    } else {
        return {
            isValid: false,
            percentOfSetPressure: percent,
            message: `Inlet pressure drop is ${percent.toFixed(1)}% of set pressure. Significantly exceeds API 520 guideline (< 3%). Valve chattering and capacity reduction likely. Redesign inlet piping required.`,
            severity: 'error',
        };
    }
}

/**
 * Calculate built-up backpressure from outlet network
 * This is the pressure drop that develops when the valve is open
 * 
 * @param outletNetwork - Outlet piping network
 * @param flowRate - Relief flow rate in kg/h
 * @param fluid - Fluid properties at outlet conditions
 * @returns Built-up backpressure in barg
 */
export function calculateBuiltUpBackpressure(
    outletNetwork: PipelineNetwork | undefined,
    flowRate: number,
    fluid: FluidProperties
): number {
    const result = calculateNetworkPressureDrop(outletNetwork, flowRate, fluid);

    // Convert kPa to barg
    return result.totalPressureDrop / 100;
}

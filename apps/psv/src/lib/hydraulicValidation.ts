/**
 * Local TypeScript hydraulic validation (fallback when Python API unavailable)
 * Simplified pressure drop calculations for PSV inlet/outlet networks
 */

import { PipelineNetwork } from "@/data/types";
import { FluidProperties, InletValidationResult } from "./apiClient";

// ============================================================================
// Local Calculation Functions (Fallback)
// ============================================================================

/**
 * Calculate total pressure drop through a pipeline network (LOCAL)
 * This is a simplified calculation - Python API provides more accurate results
 */
export function calculateNetworkPressureDrop(
    network: PipelineNetwork | undefined,
    massFlowRate: number,  // kg/h
    fluid: FluidProperties
): number {
    if (!network || !network.pipes || network.pipes.length === 0) {
        return 0;
    }

    // Simple summation of pipe pressure drops
    // In real implementation, this would use proper hydraulic calculations
    let totalDrop = 0;

    for (const pipe of network.pipes) {
        // Simplified fallback estimation
        // In production, this should be calculated by the Python API
        // Rough estimation: 0.1 kPa per meter for typical PSV piping
        const length = pipe.length || 0;
        totalDrop += length * 0.1;
    }

    return totalDrop; // kPa
}

/**
 * Validate inlet pressure drop against API 520 3% guideline (LOCAL)
 */
export function validateInletPressureDrop(
    inletDeltaP: number,  // kPa
    setPressure: number  // barg
): InletValidationResult {
    // Convert set pressure to kPa for comparison
    const setPressureKPa = setPressure * 100;  // bar to kPa

    // Calculate percentage
    const percent = setPressureKPa > 0 ? (inletDeltaP / setPressureKPa) * 100 : 0;

    // Determine validation status based on API 520 guideline
    let isValid: boolean;
    let message: string;
    let severity: 'success' | 'warning' | 'error';

    if (percent < 3.0) {
        isValid = true;
        severity = 'success';
        message = `Inlet pressure drop is ${percent.toFixed(1)}% of set pressure. ✓ Complies with API 520 guideline (< 3%).`;
    } else if (percent < 5.0) {
        isValid = false;
        severity = 'warning';
        message = `Inlet pressure drop is ${percent.toFixed(1)}% of set pressure. ⚠ Exceeds API 520 guideline (< 3%) but may be acceptable with justification.`;
    } else {
        isValid = false;
        severity = 'error';
        message = `Inlet pressure drop is ${percent.toFixed(1)}% of set pressure. ✗ Significantly exceeds API 520 guideline. Inlet piping redesign strongly recommended.`;
    }

    return {
        success: true,
        inletPressureDrop: inletDeltaP,
        inletPressureDropPercent: percent,
        isValid,
        message,
        severity,
    };
}

/**
 * Calculate built-up backpressure from outlet network (LOCAL)
 */
export function calculateBuiltUpBackpressure(
    outletNetwork: PipelineNetwork | undefined,
    massFlowRate: number,
    fluid: FluidProperties,
    destinationPressure: number = 0  // barg
): number {
    if (!outletNetwork) {
        return 0;
    }

    // Calculate total outlet pressure drop
    const outletDrop = calculateNetworkPressureDrop(outletNetwork, massFlowRate, fluid);

    // Built-up backpressure = destination pressure + outlet pressure drop
    // Convert kPa to barg
    const backpressure = destinationPressure + (outletDrop / 100);

    return backpressure;  // barg
}

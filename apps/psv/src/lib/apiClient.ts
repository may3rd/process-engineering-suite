/**
 * API client for PSV hydraulic calculations via Python backend
 * Provides inlet validation and network pressure drop calculations
 */

import { PipelineNetwork, PipeProps, NodeProps } from "@/data/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ============================================================================
// Type Definitions
// ============================================================================

export interface FluidProperties {
    phase: 'gas' | 'liquid' | 'two_phase';
    temperature: number;  // °C
    pressure: number;  // barg
    molecularWeight?: number;
    compressibilityZ?: number;
    specificHeatRatio?: number;
    gasViscosity?: number;  // cP
    liquidDensity?: number;  // kg/m³
    liquidViscosity?: number;  // cP
}

export interface InletValidationRequest {
    inletNetwork: PipelineNetwork;
    psvSetPressure: number;  // barg
    massFlowRate: number;  // kg/h
    fluid: FluidProperties;
}

export interface InletValidationResult {
    success: boolean;
    inletPressureDrop: number;  // kPa
    inletPressureDropPercent: number;  // % of set pressure
    isValid: boolean;
    message: string;
    severity: 'success' | 'warning' | 'error';
    error?: string;
}

export interface NetworkPressureDropRequest {
    network: PipelineNetwork;
    massFlowRate: number;  // kg/h
    fluid: FluidProperties;
}

export interface NetworkPressureDropResult {
    success: boolean;
    totalPressureDrop: number;  // kPa
    pipeResults: Array<{
        pipeId: string;
        pressureDrop: number;
        reynoldsNumber?: number;
        frictionFactor?: number;
    }>;
    error?: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Validate inlet pressure drop against API 520 3% guideline
 */
export async function validateInletPressureDropAPI(
    request: InletValidationRequest
): Promise<InletValidationResult> {
    try {
        const response = await fetch(`${API_BASE_URL}/hydraulics/validate-inlet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        return {
            ...result,
            success: true,
        };
    } catch (error) {
        console.error('API call failed:', error);
        return {
            success: false,
            inletPressureDrop: 0,
            inletPressureDropPercent: 0,
            isValid: false,
            message: "API unavailable - using local calculation",
            severity: 'error',
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Calculate total pressure drop for a pipeline network
 */
export async function calculateNetworkPressureDropAPI(
    request: NetworkPressureDropRequest
): Promise<NetworkPressureDropResult> {
    try {
        const response = await fetch(`${API_BASE_URL}/hydraulics/network/pressure-drop`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        return {
            ...result,
            success: true,
        };
    } catch (error) {
        console.error('API call failed:', error);
        return {
            success: false,
            totalPressureDrop: 0,
            pipeResults: [],
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Check if Python API is healthy and available
 */
export async function checkAPIHealth(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

        const response = await fetch(`${API_BASE_URL}/health`, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) return false;

        const data = await response.json();
        return data.status === "healthy";
    } catch {
        return false;
    }
}

/**
 * API client for the Process Engineering Suite Python backend.
 * 
 * This module provides functions to call the FastAPI hydraulics
 * calculation endpoints.
 */

import type { PipeProps, PressureDropCalculationResults, resultSummary } from "@/lib/types";

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface CalculationResult {
    edgeId: string;
    success: boolean;
    error?: string;
    pressureDropResults?: PressureDropCalculationResults;
    resultSummary?: resultSummary;
    equivalentLength?: number;
}

/**
 * Calculate pressure drop for a single pipe section via the Python backend.
 * 
 * @param pipe - The pipe properties to calculate
 * @returns Promise with calculation results
 */
export async function calculatePipeSectionAPI(pipe: PipeProps): Promise<CalculationResult> {
    try {
        const response = await fetch(`${API_BASE_URL}/hydraulics/edge/${pipe.id}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(pipe),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Map API response to TypeScript types
        return {
            edgeId: data.edgeId,
            success: data.success,
            error: data.error,
            pressureDropResults: data.pressureDropResults ? {
                fittingK: data.pressureDropResults.fittingK,
                pipeLengthK: data.pressureDropResults.pipeLengthK,
                userK: data.pressureDropResults.userK,
                pipingFittingSafetyFactor: data.pressureDropResults.pipingFittingSafetyFactor,
                totalK: data.pressureDropResults.totalK,
                reynoldsNumber: data.pressureDropResults.reynoldsNumber,
                frictionalFactor: data.pressureDropResults.frictionalFactor,
                flowScheme: data.pressureDropResults.flowScheme,
                pipeAndFittingPressureDrop: data.pressureDropResults.pipeAndFittingPressureDrop,
                elevationPressureDrop: data.pressureDropResults.elevationPressureDrop,
                controlValvePressureDrop: data.pressureDropResults.controlValvePressureDrop,
                controlValveCV: data.pressureDropResults.controlValveCV,
                orificePressureDrop: data.pressureDropResults.orificePressureDrop,
                userSpecifiedPressureDrop: data.pressureDropResults.userSpecifiedPressureDrop,
                totalSegmentPressureDrop: data.pressureDropResults.totalSegmentPressureDrop,
                normalizedPressureDrop: data.pressureDropResults.normalizedPressureDrop,
                gasFlowCriticalPressure: data.pressureDropResults.gasFlowCriticalPressure,
            } : undefined,
            resultSummary: data.resultSummary ? {
                inletState: data.resultSummary.inletState,
                outletState: data.resultSummary.outletState,
            } : undefined,
            equivalentLength: data.equivalentLength,
        };
    } catch (error) {
        console.error("Failed to calculate pipe section via API:", error);
        return {
            edgeId: pipe.id,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Check if the Python backend API is available.
 * 
 * @returns Promise<boolean> - true if API is healthy
 */
export async function checkAPIHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            return false;
        }

        const data = await response.json();
        return data.status === "healthy";
    } catch {
        return false;
    }
}

/**
 * Calculate pipe section with fallback to local calculation.
 * 
 * This function tries the API first, and if unavailable, falls back
 * to the local TypeScript calculation.
 * 
 * @param pipe - The pipe properties to calculate
 * @param localCalculateFn - Fallback function for local calculation
 * @returns The pipe with updated calculation results
 */
export async function calculatePipeWithFallback(
    pipe: PipeProps,
    localCalculateFn: (pipe: PipeProps) => PipeProps
): Promise<PipeProps> {
    // Try API first
    const result = await calculatePipeSectionAPI(pipe);

    if (result.success && result.pressureDropResults) {
        // Merge API results into pipe
        return {
            ...pipe,
            pressureDropCalculationResults: result.pressureDropResults,
            resultSummary: result.resultSummary,
            equivalentLength: result.equivalentLength,
            fittingK: result.pressureDropResults.fittingK,
            pipeLengthK: result.pressureDropResults.pipeLengthK,
            totalK: result.pressureDropResults.totalK,
        };
    }

    // Fallback to local calculation
    console.warn("API unavailable, falling back to local calculation:", result.error);
    return localCalculateFn(pipe);
}

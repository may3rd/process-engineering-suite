/**
 * API client for PSV hydraulic calculations via Python backend
 * Provides inlet validation and network pressure drop calculations
 */

import { PipelineNetwork, PipeProps } from "@/data/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ============================================================================
// Type Definitions
// ============================================================================

export interface FluidProperties {
    phase: 'gas' | 'liquid' | 'two_phase' | 'steam';
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
    inletPressureDrop: number;  // Pa (from API)
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
    boundaryPressure?: number; // barg
    boundaryPressureUnit?: string;
    direction?: 'forward' | 'backward' | 'auto';
}

export interface NetworkPressureDropResult {
    success: boolean;
    totalPressureDrop: number;  // Pa (from API)
    pipeResults: Array<{
        pipeId: string;
        pressureDrop: number;
        reynoldsNumber?: number;
        frictionFactor?: number;
    }>;
    error?: string;
}

// ============================================================================
// API Request Schema Types (matching Python backend)
// ============================================================================

interface APIFluidRequest {
    name?: string;
    phase?: string;
    density?: number;
    densityUnit?: string;
    viscosity?: number;
    viscosityUnit?: string;
    molecularWeight?: number;
    zFactor?: number;
    specificHeatRatio?: number;
}

interface APIPipeSectionRequest {
    id: string;
    name: string;
    startNodeId?: string;
    endNodeId?: string;
    direction?: string;
    length?: number;
    lengthUnit?: string;
    pipeDiameter?: number;
    pipeDiameterUnit?: string;
    roughness?: number;
    roughnessUnit?: string;
    elevation?: number;
    elevationUnit?: string;
    massFlowRate?: number;
    massFlowRateUnit?: string;
    boundaryPressure?: number;
    boundaryPressureUnit?: string;
    boundaryTemperature?: number;
    boundaryTemperatureUnit?: string;
    fittings?: Array<{ type: string; count: number }>;
    schedule?: string;
    fittingType?: string;
    fluid?: APIFluidRequest;
}

interface APINetworkRequest {
    name: string;
    fluid: APIFluidRequest;
    sections: APIPipeSectionRequest[];
    boundaryPressure?: number;
    boundaryPressureUnit?: string;
    boundaryTemperature?: number;
    boundaryTemperatureUnit?: string;
    massFlowRate?: number;
    massFlowRateUnit?: string;
    direction?: string;
    gasFlowModel?: string;
}

interface APIInletValidationRequest extends APINetworkRequest {
    psvSetPressure: number;
    psvSetPressureUnit?: string;
}

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Transform FluidProperties to API format
 */
function transformFluid(fluid: FluidProperties): APIFluidRequest {
    const normalizedPhase =
        fluid.phase === 'two_phase' ? 'liquid' :
            fluid.phase === 'steam' ? 'gas' :
                fluid.phase;

    return {
        name: "fluid",
        phase: normalizedPhase,  // API may not support two_phase/steam directly
        density: fluid.liquidDensity,
        densityUnit: "kg/m³",
        viscosity: fluid.phase === 'gas' ? fluid.gasViscosity : fluid.liquidViscosity,
        viscosityUnit: "cP",
        molecularWeight: fluid.molecularWeight,
        zFactor: fluid.compressibilityZ,
        specificHeatRatio: fluid.specificHeatRatio,
    };
}

/**
 * Transform PipeProps to API PipeSectionRequest format
 */
function transformPipe(pipe: PipeProps, massFlowRate: number, fluid: FluidProperties): APIPipeSectionRequest {
    // Cast to any for accessing optional properties that may not be in type
    const pipeAny = pipe as unknown as Record<string, unknown>;

    return {
        id: pipe.id,
        name: pipe.name || `Pipe-${pipe.id}`,
        startNodeId: pipe.startNodeId,
        endNodeId: pipe.endNodeId,
        direction: "forward",
        length: pipe.length || 0,
        lengthUnit: "m",
        pipeDiameter: pipe.diameter || 100,
        pipeDiameterUnit: "mm",
        roughness: pipe.roughness || 0.0457,
        roughnessUnit: "mm",
        elevation: pipe.elevation || 0,
        elevationUnit: "m",
        massFlowRate: massFlowRate,
        massFlowRateUnit: "kg/h",
        boundaryPressure: fluid.pressure,
        boundaryPressureUnit: "barg",
        boundaryTemperature: fluid.temperature,
        boundaryTemperatureUnit: "C",
        schedule: (pipeAny.schedule as string) || "40",
        fittingType: "LR",
        fittings: (pipeAny.fittings as Array<{ type: string; count: number }> | undefined)?.map(f => ({ type: f.type, count: f.count || 1 })) || [],
        fluid: transformFluid(fluid),
    };
}

/**
 * Transform PSV InletValidationRequest to API format
 */
function transformInletValidationRequest(request: InletValidationRequest): APIInletValidationRequest {
    const sections = request.inletNetwork.pipes.map(pipe =>
        transformPipe(pipe, request.massFlowRate, request.fluid)
    );

    return {
        name: "inlet-network",
        fluid: transformFluid(request.fluid),
        sections,
        boundaryPressure: request.fluid.pressure,
        boundaryPressureUnit: "barg",
        boundaryTemperature: request.fluid.temperature,
        boundaryTemperatureUnit: "C",
        massFlowRate: request.massFlowRate,
        massFlowRateUnit: "kg/h",
        direction: "forward",
        gasFlowModel: request.fluid.phase === 'gas' ? "isothermal" : "isothermal",
        psvSetPressure: request.psvSetPressure,
        psvSetPressureUnit: "barg",
    };
}

/**
 * Transform NetworkPressureDropRequest to API format
 */
function transformNetworkRequest(request: NetworkPressureDropRequest): APINetworkRequest {
    const sections = request.network.pipes.map(pipe =>
        transformPipe(pipe, request.massFlowRate, request.fluid)
    );

    return {
        name: "network",
        fluid: transformFluid(request.fluid),
        sections,
        boundaryPressure: request.boundaryPressure ?? request.fluid.pressure,
        boundaryPressureUnit: request.boundaryPressureUnit ?? "barg",
        boundaryTemperature: request.fluid.temperature,
        boundaryTemperatureUnit: "C",
        massFlowRate: request.massFlowRate,
        massFlowRateUnit: "kg/h",
        direction: request.direction || "forward",
        gasFlowModel: request.fluid.phase === 'gas' ? "isothermal" : "isothermal",
    };
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
        // Transform to API format
        const apiRequest = transformInletValidationRequest(request);

        console.log('🌐 Sending inlet validation request:', apiRequest);

        const response = await fetch(`${API_BASE_URL}/hydraulics/validate-inlet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(apiRequest),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Inlet validation response:', result);

        return {
            success: result.success,
            inletPressureDrop: result.inletPressureDrop || 0,
            inletPressureDropPercent: result.inletPressureDropPercent || 0,
            isValid: result.isValid,
            message: result.message,
            severity: result.severity,
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
        // Transform to API format
        const apiRequest = transformNetworkRequest(request);

        console.log('🌐 Sending network pressure drop request:', apiRequest);

        const response = await fetch(`${API_BASE_URL}/hydraulics/network/pressure-drop`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(apiRequest),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Network pressure drop response:', result);

        return {
            success: result.success,
            totalPressureDrop: result.totalPressureDrop || 0,
            pipeResults: result.results?.map((r: { edgeId: string; pressureDropResults?: { totalSegmentPressureDrop?: number; reynoldsNumber?: number; frictionalFactor?: number } }) => ({
                pipeId: r.edgeId,
                pressureDrop: r.pressureDropResults?.totalSegmentPressureDrop || 0,
                reynoldsNumber: r.pressureDropResults?.reynoldsNumber,
                frictionFactor: r.pressureDropResults?.frictionalFactor,
            })) || [],
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

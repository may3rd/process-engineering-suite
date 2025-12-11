/**
 * Local TypeScript hydraulic validation (fallback when Python API unavailable)
 * Uses the shared physics-engine package for detailed hydraulic calculations.
 */

import { PipelineNetwork } from "@/data/types";
import { FluidProperties, InletValidationResult } from "./apiClient";
import { recalculatePipeFittingLosses } from "@eng-suite/physics";
import type { PipeProps, Fluid } from "@eng-suite/physics";
import { convertUnit } from "@eng-suite/physics/unitConversion";

type CalcDirection = "forward" | "backward";

export interface NetworkCalculationOptions {
    boundaryPressure?: number;
    boundaryPressureUnit?: string;
    boundaryTemperature?: number;
    boundaryTemperatureUnit?: string;
    direction?: CalcDirection;
}

interface NetworkSegmentResult {
    pipeId: string;
    name?: string;
    pressureDropPa?: number;
    reynoldsNumber?: number;
    frictionFactor?: number;
    totalK?: number;
}

interface NetworkHydraulicsResult {
    totalPressureDropPa: number;
    segments: NetworkSegmentResult[];
    finalPressurePa?: number;
    finalTemperatureK?: number;
}

const FALLBACK_PRESSURE_DROP_PER_M_KPA = 0.01;

function isPositive(value?: number | null): value is number {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function convertValue(
    value?: number,
    fromUnit?: string,
    toUnit?: string
): number | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (!toUnit) {
        return value;
    }
    try {
        const converted = convertUnit(value, fromUnit ?? toUnit, toUnit);
        const numeric = Number(converted);
        return Number.isFinite(numeric) ? numeric : undefined;
    } catch {
        return undefined;
    }
}

function buildFluid(fluid: FluidProperties): Fluid | null {
    const normalizedPhase: Fluid["phase"] =
        fluid.phase === "gas" || fluid.phase === "steam" || fluid.phase === "two_phase"
            ? "gas"
            : "liquid";

    const viscosity =
        normalizedPhase === "gas"
            ? fluid.gasViscosity ?? fluid.liquidViscosity
            : fluid.liquidViscosity ?? fluid.gasViscosity;

    const density = normalizedPhase === "gas" ? undefined : fluid.liquidDensity;

    if (normalizedPhase === "liquid" && (!isPositive(density) || !isPositive(viscosity))) {
        return null;
    }

    if (
        normalizedPhase === "gas" &&
        (!isPositive(viscosity) ||
            !isPositive(fluid.molecularWeight) ||
            !isPositive(fluid.compressibilityZ) ||
            !isPositive(fluid.specificHeatRatio))
    ) {
        return null;
    }

    return {
        id: "psv-fluid",
        phase: normalizedPhase,
        density,
        densityUnit: density ? "kg/m3" : undefined,
        viscosity,
        viscosityUnit: viscosity ? "cP" : undefined,
        molecularWeight: fluid.molecularWeight,
        zFactor: fluid.compressibilityZ,
        specificHeatRatio: fluid.specificHeatRatio,
    };
}

function mergeFluidData(pipe: PipeProps, baseFluid: Fluid): Fluid {
    const merged: Fluid = {
        ...baseFluid,
        ...(pipe.fluid ?? {}),
    };

    merged.id = merged.id ?? "psv-fluid";
    merged.phase = merged.phase ?? baseFluid.phase;

    if (!merged.viscosity && baseFluid.viscosity) {
        merged.viscosity = baseFluid.viscosity;
        merged.viscosityUnit = baseFluid.viscosityUnit;
    }
    if (!merged.density && baseFluid.density) {
        merged.density = baseFluid.density;
        merged.densityUnit = baseFluid.densityUnit;
    }
    if (!merged.molecularWeight && baseFluid.molecularWeight) {
        merged.molecularWeight = baseFluid.molecularWeight;
    }
    if (!merged.zFactor && baseFluid.zFactor) {
        merged.zFactor = baseFluid.zFactor;
    }
    if (!merged.specificHeatRatio && baseFluid.specificHeatRatio) {
        merged.specificHeatRatio = baseFluid.specificHeatRatio;
    }

    return merged;
}

function preparePipe(
    pipe: PipeProps,
    fluid: Fluid,
    massFlowRate: number,
    boundaryPressurePa: number,
    boundaryTemperatureK: number,
    direction: CalcDirection
): PipeProps {
    return {
        ...pipe,
        fluid,
        direction,
        gasFlowModel: fluid.phase === "gas" ? "adiabatic" : pipe.gasFlowModel,
        massFlowRate,
        massFlowRateUnit: "kg/h",
        boundaryPressure: boundaryPressurePa,
        boundaryPressureUnit: "Pa",
        boundaryTemperature: boundaryTemperatureK,
        boundaryTemperatureUnit: "K",
    };
}

function fallbackNetworkPressureDrop(network: PipelineNetwork | undefined): number {
    if (!network?.pipes?.length) {
        return 0;
    }
    return network.pipes.reduce((sum, pipe) => sum + (pipe.length || 0) * FALLBACK_PRESSURE_DROP_PER_M_KPA, 0);
}

function runNetworkHydraulics(
    network: PipelineNetwork,
    massFlowRate: number,
    fluid: FluidProperties,
    options?: NetworkCalculationOptions
): NetworkHydraulicsResult | null {
    const normalizedMassFlow = Math.abs(massFlowRate);
    if (!isPositive(normalizedMassFlow) || !network?.pipes?.length) {
        return null;
    }

    const baseFluid = buildFluid(fluid);
    if (!baseFluid) {
        return null;
    }

    const initialPressurePa = convertValue(
        options?.boundaryPressure ?? fluid.pressure,
        options?.boundaryPressureUnit ?? "barg",
        "Pa"
    );
    const initialTemperatureK = convertValue(
        options?.boundaryTemperature ?? fluid.temperature,
        options?.boundaryTemperatureUnit ?? "C",
        "K"
    );

    if (!isPositive(initialPressurePa) || !isPositive(initialTemperatureK)) {
        return null;
    }

    let currentPressurePa = initialPressurePa;
    let currentTemperatureK = initialTemperatureK;
    const segments: NetworkSegmentResult[] = [];
    let totalDropPa = 0;

    for (const pipe of network.pipes) {
        const direction: CalcDirection = options?.direction ?? (pipe.direction as CalcDirection) ?? "forward";
        const mergedFluid = mergeFluidData(pipe, baseFluid);
        const resolvedPipe = preparePipe(
            pipe,
            mergedFluid,
            normalizedMassFlow,
            currentPressurePa,
            currentTemperatureK,
            direction
        );

        const solvedPipe = recalculatePipeFittingLosses(resolvedPipe);
        const dropPa = solvedPipe.pressureDropCalculationResults?.totalSegmentPressureDrop;

        if (typeof dropPa === "number" && Number.isFinite(dropPa)) {
            totalDropPa += dropPa;
        }

        segments.push({
            pipeId: pipe.id,
            name: pipe.name,
            pressureDropPa: dropPa,
            reynoldsNumber: solvedPipe.pressureDropCalculationResults?.reynoldsNumber,
            frictionFactor: solvedPipe.pressureDropCalculationResults?.frictionalFactor,
            totalK: solvedPipe.pressureDropCalculationResults?.totalK,
        });

        const outletState = solvedPipe.resultSummary?.outletState;
        if (outletState?.pressure !== undefined && Number.isFinite(outletState.pressure)) {
            currentPressurePa = outletState.pressure;
        } else if (typeof dropPa === "number" && Number.isFinite(dropPa)) {
            currentPressurePa = direction === "backward" ? currentPressurePa + dropPa : currentPressurePa - dropPa;
        }

        if (outletState?.temperature !== undefined && Number.isFinite(outletState.temperature)) {
            currentTemperatureK = outletState.temperature;
        }
    }

    return {
        totalPressureDropPa: totalDropPa,
        segments,
        finalPressurePa: currentPressurePa,
        finalTemperatureK: currentTemperatureK,
    };
}

export function calculateNetworkPressureDrop(
    network: PipelineNetwork | undefined,
    massFlowRate: number,
    fluid: FluidProperties,
    options?: NetworkCalculationOptions
): number {
    if (!network || !network.pipes?.length) {
        return 0;
    }

    const result = runNetworkHydraulics(network, massFlowRate, fluid, options);
    if (result) {
        return result.totalPressureDropPa / 1000;
    }

    return fallbackNetworkPressureDrop(network);
}

export function validateInletPressureDrop(
    inletDeltaP: number,
    setPressure: number
): InletValidationResult {
    const setPressureKPa = setPressure * 100;
    const percent = setPressureKPa > 0 ? (inletDeltaP / setPressureKPa) * 100 : 0;

    let isValid: boolean;
    let message: string;
    let severity: "success" | "warning" | "error";

    if (percent < 3.0) {
        isValid = true;
        severity = "success";
        message = `Inlet pressure drop is ${percent.toFixed(1)}% of set pressure. ✓ Complies with API 520 guideline (< 3%).`;
    } else if (percent < 5.0) {
        isValid = false;
        severity = "warning";
        message = `Inlet pressure drop is ${percent.toFixed(1)}% of set pressure. ⚠ Exceeds API 520 guideline (< 3%) but may be acceptable with justification.`;
    } else {
        isValid = false;
        severity = "error";
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

export function calculateBuiltUpBackpressure(
    outletNetwork: PipelineNetwork | undefined,
    massFlowRate: number,
    fluid: FluidProperties,
    destinationPressure: number = 0
): number {
    if (!outletNetwork) {
        return 0;
    }

    const outletDrop = calculateNetworkPressureDrop(outletNetwork, massFlowRate, fluid, {
        boundaryPressure: destinationPressure,
        boundaryPressureUnit: "barg",
        direction: "backward",
    });

    return destinationPressure + outletDrop / 100;
}

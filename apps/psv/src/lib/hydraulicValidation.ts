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

    // Pipe properties
    diameter?: number;
    inletDiameter?: number;
    outletDiameter?: number;
    length?: number;
    roughness?: number;
    elevation?: number;
    schedule?: string;
    fittings?: any[];

    // Fluid properties
    phase?: string;
    molecularWeight?: number;
    zFactor?: number;
    specificHeatRatio?: number;
    viscosity?: number;

    // Calculation settings
    direction?: string;
    gasFlowModel?: string;
    massFlowRate?: number;
    boundaryPressure?: number;
    boundaryTemperature?: number;
    pipeSectionType?: string;
    erosionalConstant?: number;

    // K-factors
    fittingK?: number;
    pipeLengthK?: number;
    userK?: number;
    totalK?: number;
    pipingFittingSafetyFactor?: number;

    // Hydraulics
    pressureDropPa?: number;
    reynoldsNumber?: number;
    frictionFactor?: number;
    flowScheme?: string;
    velocity?: number;
    machNumber?: number;

    // Pressure breakdown
    pipeAndFittingPressureDrop?: number;
    elevationPressureDrop?: number;
    controlValvePressureDrop?: number;
    orificePressureDrop?: number;
    userSpecifiedPressureDrop?: number;
    totalSegmentPressureDrop?: number;
    normalizedPressureDrop?: number;
    gasFlowCriticalPressure?: number;

    // Control valve / Orifice
    controlValveCV?: number;
    controlValveCg?: number;
    orificeBetaRatio?: number;

    // State
    inletPressurePa?: number;
    outletPressurePa?: number;
    inletTemperatureK?: number;
    outletTemperatureK?: number;
    inletDensity?: number;
    outletDensity?: number;
    inletVelocity?: number;
    outletVelocity?: number;
    inletMachNumber?: number;
    outletMachNumber?: number;
    inletErosionalVelocity?: number;
    outletErosionalVelocity?: number;
    inletFlowMomentum?: number;
    outletFlowMomentum?: number;

    // Alerts
    isChoked?: boolean;
    isErosional?: boolean;
}

export interface HydraulicSegmentResult {
    pipeId: string;
    name: string;
    description?: string;

    // I. GENERAL DATA
    fluidPhase?: 'Liquid' | 'Gas';
    calculationType?: string; // "Pipeline", "Control Valve", "Orifice"
    flowDirection?: 'Forward' | 'Backward';
    gasFlowModel?: 'Adiabatic' | 'Isothermal' | 'N/A';
    boundaryPressureKPag?: number;

    // II. FLUID DATA
    massFlowRateKgH?: number;
    volumetricFlowRateM3H?: number;
    temperatureC?: number;
    densityKgM3?: number;
    molecularWeight?: number;
    compressibilityZ?: number;
    specificHeatRatio?: number;
    viscosityCp?: number;

    // III. PIPE, FITTING & ELEVATION
    diameter: number;
    schedule?: string;
    pipeID?: number; // Inner diameter from schedule
    inletPipeDN?: number; // Inlet pipe diameter if different
    outletPipeDN?: number; // Outlet pipe diameter if different
    length: number;
    elevationChangeM?: number; // negative for DOWN
    roughnessMm?: number;
    erosionalConstantC?: number;
    // Fitting counts (individual rows in CSV)
    fittingCounts?: Record<string, number>; // e.g. {"elbow_90": 2, "tee_through": 1}
    fittingK?: number;
    pipeLengthK?: number;
    userK?: number;
    totalK: number;
    pipingFittingSafetyFactor?: number;
    totalKWithSafety?: number;

    // IV. OPTIONAL CALCULATIONS
    controlValveCv?: number;
    controlValveCg?: number;
    recoveryFactorC1?: number;
    terminalDPRatioXT?: number;
    orificeBetaRatio?: number;

    // V. CHARACTERISTIC SUMMARY
    reynoldsNumber: number;
    flowRegime?: 'Laminar' | 'Transition' | 'Turbulent';
    frictionFactor: number;
    flowMomentumPa?: number;
    criticalPressureKPa?: number;
    velocity: number;
    machNumber?: number;

    // VI. PRESSURE LOSSES SUMMARY
    pressureDropKPa: number;
    pipeAndFittingDropKPa?: number;
    elevationDropKPa?: number;
    controlValveDropKPa?: number;
    orificeDropKPa?: number;
    userSpecifiedDropKPa?: number;
    segmentTotalDropKPa?: number;
    unitFrictionLossKPa100m?: number;

    // VII. RESULT SUMMARY (Inlet & Outlet states)
    inletPressureBarg: number;
    inletTemperatureC?: number;
    inletDensityKgM3?: number;
    inletMachNumber?: number;
    inletVelocityMs?: number;
    inletErosionalVelocityMs?: number;
    inletFlowMomentumPa?: number;
    outletPressureBarg: number;
    outletTemperatureC?: number;
    outletDensityKgM3?: number;
    outletMachNumber?: number;
    outletVelocityMs?: number;
    outletErosionalVelocityMs?: number;
    outletFlowMomentumPa?: number;

    // STATUS
    isChoked: boolean;
    isErosional: boolean;
}

interface NetworkHydraulicsResult {
    totalPressureDropPa: number;
    segments: NetworkSegmentResult[];
    finalPressurePa?: number;
    finalTemperatureK?: number;
    hasChokedFlow?: boolean;
    warnings: string[];
}

const FALLBACK_PRESSURE_DROP_PER_M_KPA = 0.01;

/**
 * Aggregate fitting counts by type from fittings array
 */
function aggregateFittingCounts(fittings?: any[]): Record<string, number> {
    const counts: Record<string, number> = {};
    if (!fittings) return counts;

    for (const f of fittings) {
        if (f.type && typeof f.count === 'number') {
            counts[f.type] = (counts[f.type] ?? 0) + f.count;
        }
    }
    return counts;
}

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
        console.warn('[Hydraulic] Early exit: invalid massFlow or no pipes', {
            massFlowRate,
            normalizedMassFlow,
            pipeCount: network?.pipes?.length,
        });
        return null;
    }

    const baseFluid = buildFluid(fluid);
    if (!baseFluid) {
        console.warn('[Hydraulic] Early exit: buildFluid returned null', {
            inputFluid: fluid,
        });
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
        console.warn('[Hydraulic] Early exit: invalid pressure or temperature', {
            boundaryPressure: options?.boundaryPressure,
            boundaryPressureUnit: options?.boundaryPressureUnit,
            initialPressurePa,
            boundaryTemperature: options?.boundaryTemperature,
            boundaryTemperatureUnit: options?.boundaryTemperatureUnit,
            initialTemperatureK,
        });
        return null;
    }

    let currentPressurePa = initialPressurePa;
    let currentTemperatureK = initialTemperatureK;
    const segments: NetworkSegmentResult[] = [];
    let totalDropPa = 0;

    console.group('[Hydraulic Calculation] Network Hydraulics');
    console.log('Input:', {
        massFlowRate: normalizedMassFlow,
        direction: options?.direction,
        fluidPhase: baseFluid.phase,
        initialPressurePa,
        initialTemperatureK,
        pipeCount: network.pipes.length,
    });
    console.log('Base Fluid:', baseFluid);

    // For backward direction, process pipes in reverse order (from destination to source)
    // so the boundary pressure at destination cascades correctly back to source
    const globalDirection = options?.direction ?? "forward";
    const pipesToProcess = globalDirection === "backward"
        ? [...network.pipes].reverse()
        : network.pipes;

    for (const pipe of pipesToProcess) {
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

        console.log(`[Pipe: ${pipe.name}]`, {
            input: {
                diameter: resolvedPipe.diameter,
                length: resolvedPipe.length,
                roughness: resolvedPipe.roughness,
                elevation: resolvedPipe.elevation,
                direction,
                boundaryPressure: resolvedPipe.boundaryPressure,
                massFlowRate: resolvedPipe.massFlowRate,
                fittings: resolvedPipe.fittings?.length || 0,
                fluid: mergedFluid,
            },
            output: {
                pressureDropPa: dropPa,
                reynolds: solvedPipe.pressureDropCalculationResults?.reynoldsNumber,
                frictionFactor: solvedPipe.pressureDropCalculationResults?.frictionalFactor,
                totalK: solvedPipe.pressureDropCalculationResults?.totalK,
                velocity: solvedPipe.velocity,
            },
            resultSummary: solvedPipe.resultSummary,
        });

        console.log({
            resolvePipe: resolvedPipe,
            solvedPipe: solvedPipe,
        });

        if (typeof dropPa === "number" && Number.isFinite(dropPa)) {
            totalDropPa += dropPa;
        }

        // Detect choked flow from gas solver
        const inletState = solvedPipe.resultSummary?.inletState as {
            is_choked?: boolean;
            pressure?: number;
            temperature?: number;
            density?: number;
            velocity?: number;
            machNumber?: number;
            erosionalVelocity?: number;
        } | undefined;
        const outletState = solvedPipe.resultSummary?.outletState as {
            is_choked?: boolean;
            pressure?: number;
            temperature?: number;
            density?: number;
            velocity?: number;
            machNumber?: number;
            erosionalVelocity?: number;
        } | undefined;
        const pipeIsChoked = inletState?.is_choked === true || outletState?.is_choked === true;
        const pipeIsErosional = (inletState?.velocity && inletState?.erosionalVelocity && inletState.velocity > inletState.erosionalVelocity) ||
            (outletState?.velocity && outletState?.erosionalVelocity && outletState.velocity > outletState.erosionalVelocity);

        console.log(`[Choke Detection] Pipe: ${pipe.name}`, {
            inletState_is_choked: inletState?.is_choked,
            outletState_is_choked: outletState?.is_choked,
            pipeIsChoked,
            resultSummary: solvedPipe.resultSummary,
        });

        // Determine segment pressures based on direction:
        // - FORWARD: Use resultSummary values directly (physics engine knows inlet is boundary)
        // - BACKWARD: Chain manually (we process last→first, outlet = boundary, inlet = outlet + ΔP)
        let segmentInletPa: number | undefined;
        let segmentOutletPa: number | undefined;

        if (globalDirection === "forward") {
            // Forward: physics engine calculated with inlet as boundary, use resultSummary directly
            segmentInletPa = inletState?.pressure;
            segmentOutletPa = outletState?.pressure;
        } else {
            // Backward: current chain position is this segment's outlet (destination side)
            segmentOutletPa = currentPressurePa;
            segmentInletPa = typeof dropPa === "number" && Number.isFinite(dropPa)
                ? segmentOutletPa + dropPa
                : (inletState?.pressure ?? segmentOutletPa);
        }

        // Update flowMomentum field name to match physics engine
        const inletStateTyped = inletState as any;
        const outletStateTyped = outletState as any;

        segments.push({
            pipeId: pipe.id,
            name: pipe.name,

            // Pipe properties - use solvedPipe for final values
            diameter: solvedPipe.diameter,
            inletDiameter: (solvedPipe as any).inletDiameter,
            outletDiameter: (solvedPipe as any).outletDiameter,
            length: solvedPipe.length,
            roughness: solvedPipe.roughness,
            elevation: solvedPipe.elevation,
            schedule: (solvedPipe as any).schedule,
            fittings: solvedPipe.fittings,

            // Fluid properties - use solvedPipe.fluid
            phase: solvedPipe.fluid?.phase,
            molecularWeight: solvedPipe.fluid?.molecularWeight,
            zFactor: solvedPipe.fluid?.zFactor,
            specificHeatRatio: solvedPipe.fluid?.specificHeatRatio,
            viscosity: solvedPipe.fluid?.viscosity,

            // Calculation settings - use solvedPipe
            direction: solvedPipe.direction,
            gasFlowModel: solvedPipe.gasFlowModel,
            massFlowRate: solvedPipe.massFlowRate,
            boundaryPressure: solvedPipe.boundaryPressure,
            boundaryTemperature: solvedPipe.boundaryTemperature,
            pipeSectionType: (solvedPipe as any).pipeSectionType,
            erosionalConstant: (solvedPipe as any).erosionalConstant,

            // K-factors
            fittingK: solvedPipe.fittingK,
            pipeLengthK: solvedPipe.pipeLengthK,
            userK: (solvedPipe as any).userK,
            totalK: solvedPipe.totalK,
            pipingFittingSafetyFactor: solvedPipe.pipingFittingSafetyFactor,

            // Hydraulics
            pressureDropPa: dropPa,
            reynoldsNumber: solvedPipe.pressureDropCalculationResults?.reynoldsNumber,
            frictionFactor: solvedPipe.pressureDropCalculationResults?.frictionalFactor,
            flowScheme: solvedPipe.pressureDropCalculationResults?.flowScheme,
            velocity: solvedPipe.velocity,
            machNumber: outletState?.machNumber ?? inletState?.machNumber,

            // Pressure breakdown
            pipeAndFittingPressureDrop: solvedPipe.pressureDropCalculationResults?.pipeAndFittingPressureDrop,
            elevationPressureDrop: solvedPipe.pressureDropCalculationResults?.elevationPressureDrop,
            controlValvePressureDrop: solvedPipe.pressureDropCalculationResults?.controlValvePressureDrop,
            orificePressureDrop: solvedPipe.pressureDropCalculationResults?.orificePressureDrop,
            userSpecifiedPressureDrop: solvedPipe.pressureDropCalculationResults?.userSpecifiedPressureDrop,
            totalSegmentPressureDrop: solvedPipe.pressureDropCalculationResults?.totalSegmentPressureDrop,
            normalizedPressureDrop: solvedPipe.pressureDropCalculationResults?.normalizedPressureDrop,
            gasFlowCriticalPressure: solvedPipe.pressureDropCalculationResults?.gasFlowCriticalPressure,

            // Control valve / Orifice
            controlValveCV: solvedPipe.pressureDropCalculationResults?.controlValveCV,
            controlValveCg: solvedPipe.pressureDropCalculationResults?.controlValveCg,
            orificeBetaRatio: solvedPipe.pressureDropCalculationResults?.orificeBetaRatio,

            // State - use appropriate pressure values
            inletPressurePa: segmentInletPa,
            outletPressurePa: segmentOutletPa,
            inletTemperatureK: inletState?.temperature,
            outletTemperatureK: outletState?.temperature,
            inletDensity: inletState?.density,
            outletDensity: outletState?.density,
            inletVelocity: inletState?.velocity,
            outletVelocity: outletState?.velocity,
            inletMachNumber: inletState?.machNumber,
            outletMachNumber: outletState?.machNumber,
            inletErosionalVelocity: inletState?.erosionalVelocity,
            outletErosionalVelocity: outletState?.erosionalVelocity,
            inletFlowMomentum: inletStateTyped?.flowMomentum,
            outletFlowMomentum: outletStateTyped?.flowMomentum,

            // Alerts
            isChoked: pipeIsChoked,
            isErosional: pipeIsErosional === true,
        });

        // Update the chain position for the next pipe
        // For backward: next pipe's outlet = this pipe's inlet
        // For forward: use outletState directly (already handled above)
        if (globalDirection === "backward") {
            currentPressurePa = segmentInletPa ?? currentPressurePa;
        } else if (outletState?.pressure !== undefined) {
            currentPressurePa = outletState.pressure;
        }

        if (outletState?.temperature !== undefined && Number.isFinite(outletState.temperature)) {
            currentTemperatureK = outletState.temperature;
        }
    }

    // Check for any choked segments
    const chokedSegments = segments.filter(s => s.isChoked);
    const hasChokedFlow = chokedSegments.length > 0;
    const warnings: string[] = [];

    if (hasChokedFlow) {
        const chokedNames = chokedSegments.map(s => s.name || s.pipeId).join(', ');
        warnings.push(`Choked flow detected in: ${chokedNames}. Pressure drop calculation may be inaccurate.`);
    }

    // For backward direction, reverse segments back to original display order
    // Pressures are already correct: inlet > outlet (flow direction is always inlet → outlet)
    const displaySegments = globalDirection === "backward"
        ? [...segments].reverse()
        : segments;

    const result: NetworkHydraulicsResult = {
        totalPressureDropPa: totalDropPa,
        segments: displaySegments,
        finalPressurePa: currentPressurePa,
        finalTemperatureK: currentTemperatureK,
        hasChokedFlow,
        warnings,
    };

    console.log('Final Result:', {
        totalPressureDropPa: totalDropPa,
        totalPressureDropKPa: totalDropPa / 1000,
        finalPressurePa: currentPressurePa,
        segmentCount: segments.length,
        hasChokedFlow,
        warnings,
    });
    console.groupEnd();

    return result;
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

export interface NetworkPressureDropResult {
    pressureDropKPa: number;
    hasChokedFlow: boolean;
    warnings: string[];
    segments: HydraulicSegmentResult[];
}

export function calculateNetworkPressureDropWithWarnings(
    network: PipelineNetwork | undefined,
    massFlowRate: number,
    fluid: FluidProperties,
    options?: NetworkCalculationOptions
): NetworkPressureDropResult {
    if (!network || !network.pipes?.length) {
        return { pressureDropKPa: 0, hasChokedFlow: false, warnings: [], segments: [] };
    }

    const result = runNetworkHydraulics(network, massFlowRate, fluid, options);
    if (result) {
        // Convert internal segments to exported format with all fields
        const exportedSegments: HydraulicSegmentResult[] = result.segments.map(seg => {
            // Helper: convert K to °C
            const kToC = (k?: number) => typeof k === 'number' ? k - 273.15 : undefined;

            // Helper: convert Pa to kPa
            const paToKPa = (pa?: number) => typeof pa === 'number' ? pa / 1000 : undefined;

            // Calculate volumetric flow rate in m³/h
            let volumetricFlowM3H: number | undefined;
            if (seg.massFlowRate && seg.inletDensity) {
                volumetricFlowM3H = (seg.massFlowRate / seg.inletDensity) * 3600; // kg/h → kg/s → m³/s → m³/h
            }

            // Calculate unit friction loss in kPa/100m
            let unitFrictionLoss: number | undefined;
            if (seg.totalSegmentPressureDrop && seg.length && seg.length > 0) {
                unitFrictionLoss = (seg.totalSegmentPressureDrop / 1000) / (seg.length / 100);
            }

            // Determine calculation type
            let calculationType = 'Pipeline';
            if (seg.pipeSectionType === 'control valve') calculationType = 'Control Valve';
            else if (seg.pipeSectionType === 'orifice') calculationType = 'Orifice';

            // Format flow direction
            const flowDirection = seg.direction === 'backward' ? 'Backward' : 'Forward';

            // Format gas flow model
            let gasFlowModelFormatted: 'Adiabatic' | 'Isothermal' | 'N/A' = 'N/A';
            if (seg.phase === 'gas') {
                gasFlowModelFormatted = seg.gasFlowModel === 'isothermal' ? 'Isothermal' : 'Adiabatic';
            }

            // Determine flow regime
            let flowRegime: 'Laminar' | 'Transition' | 'Turbulent' = 'Turbulent';
            if (seg.flowScheme === 'laminar') flowRegime = 'Laminar';
            else if (seg.flowScheme === 'transition') flowRegime = 'Transition';

            return {
                pipeId: seg.pipeId,
                name: seg.name || seg.pipeId,
                description: undefined,

                // I. GENERAL DATA
                fluidPhase: seg.phase === 'gas' ? 'Gas' : 'Liquid',
                calculationType,
                flowDirection,
                gasFlowModel: gasFlowModelFormatted,
                boundaryPressureKPag: seg.boundaryPressure ? convertValue(seg.boundaryPressure, 'Pa', 'kPag') : undefined,

                // II. FLUID DATA
                massFlowRateKgH: seg.massFlowRate,
                volumetricFlowRateM3H: volumetricFlowM3H,
                temperatureC: kToC(seg.boundaryTemperature),
                densityKgM3: seg.inletDensity,
                molecularWeight: seg.molecularWeight,
                compressibilityZ: seg.zFactor,
                specificHeatRatio: seg.specificHeatRatio,
                viscosityCp: seg.viscosity,

                // III. PIPE, FITTING & ELEVATION
                diameter: seg.diameter || 0,
                schedule: seg.schedule,
                pipeID: seg.diameter, // Assuming diameter is already ID
                inletPipeDN: seg.inletDiameter,
                outletPipeDN: seg.outletDiameter,
                length: seg.length || 0,
                elevationChangeM: seg.elevation,
                roughnessMm: seg.roughness,
                erosionalConstantC: seg.erosionalConstant ?? 100,
                fittingCounts: aggregateFittingCounts(seg.fittings),
                fittingK: seg.fittingK,
                pipeLengthK: seg.pipeLengthK,
                userK: seg.userK,
                totalK: seg.totalK || 0,
                pipingFittingSafetyFactor: seg.pipingFittingSafetyFactor,
                totalKWithSafety: seg.totalK, // TODO: apply safety factor if needed

                // IV. OPTIONAL CALCULATIONS
                controlValveCv: seg.controlValveCV,
                controlValveCg: seg.controlValveCg,
                recoveryFactorC1: undefined, // Not in current data
                terminalDPRatioXT: undefined, // Not in current data
                orificeBetaRatio: seg.orificeBetaRatio,

                // V. CHARACTERISTIC SUMMARY
                reynoldsNumber: seg.reynoldsNumber || 0,
                flowRegime,
                frictionFactor: seg.frictionFactor || 0,
                flowMomentumPa: seg.inletFlowMomentum,
                criticalPressureKPa: paToKPa(seg.gasFlowCriticalPressure),
                velocity: seg.velocity || 0,
                machNumber: seg.machNumber,

                // VI. PRESSURE LOSSES SUMMARY
                pressureDropKPa: paToKPa(seg.pressureDropPa) || 0,
                pipeAndFittingDropKPa: paToKPa(seg.pipeAndFittingPressureDrop),
                elevationDropKPa: paToKPa(seg.elevationPressureDrop),
                controlValveDropKPa: paToKPa(seg.controlValvePressureDrop),
                orificeDropKPa: paToKPa(seg.orificePressureDrop),
                userSpecifiedDropKPa: paToKPa(seg.userSpecifiedPressureDrop),
                segmentTotalDropKPa: paToKPa(seg.totalSegmentPressureDrop),
                unitFrictionLossKPa100m: unitFrictionLoss,

                // VII. RESULT SUMMARY
                inletPressureBarg: seg.inletPressurePa ? convertValue(seg.inletPressurePa, 'Pa', 'barg') || 0 : 0,
                inletTemperatureC: kToC(seg.inletTemperatureK),
                inletDensityKgM3: seg.inletDensity,
                inletMachNumber: seg.inletMachNumber,
                inletVelocityMs: seg.inletVelocity,
                inletErosionalVelocityMs: seg.inletErosionalVelocity,
                inletFlowMomentumPa: seg.inletFlowMomentum,
                outletPressureBarg: seg.outletPressurePa ? convertValue(seg.outletPressurePa, 'Pa', 'barg') || 0 : 0,
                outletTemperatureC: kToC(seg.outletTemperatureK),
                outletDensityKgM3: seg.outletDensity,
                outletMachNumber: seg.outletMachNumber,
                outletVelocityMs: seg.outletVelocity,
                outletErosionalVelocityMs: seg.outletErosionalVelocity,
                outletFlowMomentumPa: seg.outletFlowMomentum,

                // STATUS
                isChoked: seg.isChoked || false,
                isErosional: seg.isErosional || false,
            };
        });

        return {
            pressureDropKPa: result.totalPressureDropPa / 1000,
            hasChokedFlow: result.hasChokedFlow ?? false,
            warnings: result.warnings,
            segments: exportedSegments,
        };
    }

    return {
        pressureDropKPa: fallbackNetworkPressureDrop(network),
        hasChokedFlow: false,
        warnings: [],
        segments: [],
    };
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

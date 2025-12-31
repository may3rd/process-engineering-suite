import { PipelineNetwork, PipeProps, FluidPhase } from "@/data/types";
import { convertUnit } from "@eng-suite/physics";
import { HydraulicSegmentResult } from "./hydraulicValidation";

/**
 * Normalizes a fluid phase string to the FluidPhase type.
 */
export const normalizeFluidPhase = (value?: string): FluidPhase | undefined => {
    if (!value) return undefined;
    const normalized = value.toLowerCase();
    if (normalized.includes('two')) return 'two_phase';
    if (normalized.includes('steam')) return 'steam';
    if (normalized.includes('liquid')) return 'liquid';
    return 'gas';
};

/**
 * Converts kPa to Pa.
 */
export const kPaToPa = (value?: number): number | undefined => {
    if (value === undefined || value === null) return undefined;
    if (!Number.isFinite(value)) return undefined;
    return value * 1000;
};

/**
 * Applies hydraulic calculation results (segments) back to a pipeline network.
 * Updates pipe properties and results summaries based on the calculated values.
 */
export function applyHydraulicSegmentsToNetwork(
    network: PipelineNetwork | undefined,
    segments: HydraulicSegmentResult[]
): PipelineNetwork | undefined {
    if (!network || segments.length === 0) {
        return network;
    }

    const segmentMap = new Map(segments.map((seg) => [seg.pipeId, seg]));
    let changed = false;

    const updatedPipes = network.pipes.map((pipe) => {
        const segment = segmentMap.get(pipe.id);
        if (!segment) {
            return pipe;
        }

        type PressureResults = NonNullable<PipeProps["pressureDropCalculationResults"]>;
        const nextResults: PressureResults = { ...(pipe.pressureDropCalculationResults || {}) };

        const pipeAndFittingPa = kPaToPa(segment.pipeAndFittingDropKPa);
        if (pipeAndFittingPa !== undefined) {
            nextResults.pipeAndFittingPressureDrop = pipeAndFittingPa;
        }

        const elevationPa = kPaToPa(segment.elevationDropKPa);
        if (elevationPa !== undefined) {
            nextResults.elevationPressureDrop = elevationPa;
        }

        const controlValvePa = kPaToPa(segment.controlValveDropKPa);
        if (controlValvePa !== undefined) {
            nextResults.controlValvePressureDrop = controlValvePa;
        }

        const orificePa = kPaToPa(segment.orificeDropKPa);
        if (orificePa !== undefined) {
            nextResults.orificePressureDrop = orificePa;
        }

        const userSpecifiedPa = kPaToPa(segment.userSpecifiedDropKPa);
        if (userSpecifiedPa !== undefined) {
            nextResults.userSpecifiedPressureDrop = userSpecifiedPa;
        }

        const totalDropPa = kPaToPa(segment.segmentTotalDropKPa ?? segment.pressureDropKPa);
        if (totalDropPa !== undefined) {
            nextResults.totalSegmentPressureDrop = totalDropPa;
        }

        const criticalPressurePa = kPaToPa(segment.criticalPressureKPa);
        if (criticalPressurePa !== undefined) {
            nextResults.gasFlowCriticalPressure = criticalPressurePa;
        }

        if (typeof segment.unitFrictionLossKPa100m === 'number' && Number.isFinite(segment.unitFrictionLossKPa100m)) {
            nextResults.normalizedPressureDrop = (segment.unitFrictionLossKPa100m * 1000) / 100;
        }

        if (segment.reynoldsNumber !== undefined) {
            nextResults.reynoldsNumber = segment.reynoldsNumber;
        }

        if (segment.frictionFactor !== undefined) {
            nextResults.frictionalFactor = segment.frictionFactor;
        }

        if (segment.totalK !== undefined) {
            nextResults.totalK = segment.totalK;
        }
        if (segment.fittingK !== undefined) {
            nextResults.fittingK = segment.fittingK;
        }
        if (segment.pipeLengthK !== undefined) {
            nextResults.pipeLengthK = segment.pipeLengthK;
        }
        if (segment.pipingFittingSafetyFactor !== undefined) {
            nextResults.pipingFittingSafetyFactor = segment.pipingFittingSafetyFactor;
        }
        if (segment.userK !== undefined) {
            nextResults.userK = segment.userK;
        }

        if (segment.flowRegime) {
            nextResults.flowScheme = segment.flowRegime.toLowerCase();
        }
        if (segment.controlValveCv !== undefined) {
            nextResults.controlValveCV = segment.controlValveCv;
        }
        if (segment.controlValveCg !== undefined) {
            nextResults.controlValveCg = segment.controlValveCg;
        }
        if (segment.orificeBetaRatio !== undefined) {
            nextResults.orificeBetaRatio = segment.orificeBetaRatio;
        }

        const phase = normalizeFluidPhase(segment.fluidPhase);
        const updatedFluid = phase ? {
            ...(pipe.fluid || {}),
            id: pipe.fluid?.id || `fluid-${pipe.id}`,
            phase
        } : pipe.fluid;

        // Convert pressure from barg to Pa for storage (SI units)
        const inletPressurePa = segment.inletPressureBarg !== undefined
            ? convertUnit(segment.inletPressureBarg, 'barg', 'Pa')
            : undefined;
        const outletPressurePa = segment.outletPressureBarg !== undefined
            ? convertUnit(segment.outletPressureBarg, 'barg', 'Pa')
            : undefined;

        // Convert temperature from C to K for storage (SI units)
        const inletTemperatureK = segment.inletTemperatureC !== undefined
            ? segment.inletTemperatureC + 273.15
            : undefined;
        const outletTemperatureK = segment.outletTemperatureC !== undefined
            ? segment.outletTemperatureC + 273.15
            : undefined;

        const resultSummary = {
            ...(pipe.resultSummary || {}),
            inletState: {
                ...(pipe.resultSummary?.inletState ?? {}),
                phase,
                pressure: inletPressurePa,
                temperature: inletTemperatureK,
                density: segment.inletDensityKgM3,
                velocity: segment.inletVelocityMs,
                machNumber: segment.inletMachNumber,
            },
            outletState: {
                ...(pipe.resultSummary?.outletState ?? {}),
                phase,
                pressure: outletPressurePa,
                temperature: outletTemperatureK,
                density: segment.outletDensityKgM3,
                velocity: segment.outletVelocityMs,
                machNumber: segment.outletMachNumber,
            },
        };

        const updatedPipe: PipeProps = {
            ...pipe,
            fluid: updatedFluid,
            velocity: segment.velocity ?? pipe.velocity,
            massFlowRate: segment.massFlowRateKgH ?? pipe.massFlowRate,
            massFlowRateUnit: segment.massFlowRateKgH !== undefined ? 'kg/h' : pipe.massFlowRateUnit,
            pressureDropCalculationResults: nextResults,
            resultSummary,
        };

        changed = true;
        return updatedPipe;
    });

    return changed ? { ...network, pipes: updatedPipes } : network;
}

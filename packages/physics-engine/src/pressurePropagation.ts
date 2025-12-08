import { NetworkState, NodeProps, PipeProps } from "./types";
import { convertUnit } from "@eng-suite/physics";

import { recalculatePipeFittingLosses } from "./fittings";

type PropagationResult = {
    updatedNodes: NodeProps[];
    updatedPipes: PipeProps[];
    warnings: string[];
};

// Helper: Calculate pressure drop for a specific length, handling elevation/Fwd/Bwd
const calculateProbeDrop = async (
    length: number,
    basePipe: PipeProps,
    isForward: boolean,
    calculateFn: (p: PipeProps) => Promise<PipeProps>,
    fluid?: any
): Promise<number> => {
    let probe: PipeProps = { ...basePipe, length, lengthUnit: "m" };
    if (!probe.fluid && fluid) {
        probe.fluid = { ...fluid };
    }
    probe = await calculateFn(probe);
    let drop = probe.pressureDropCalculationResults?.totalSegmentPressureDrop || 0;

    // Adjust for backward flow elevation
    if (!isForward && probe.pressureDropCalculationResults?.elevationPressureDrop) {
        drop -= 2 * probe.pressureDropCalculationResults.elevationPressureDrop;
    }
    return drop;
};

// Helper: Secant Method for Gas Length
const solveGasLength = async (
    targetDeltaP: number,
    basePipe: PipeProps,
    isForward: boolean,
    calculateFn: (p: PipeProps) => Promise<PipeProps>,
    fluid?: any
): Promise<{ length: number | null; converged: boolean; finalError: number }> => {
    // Initial Guesses - use larger values for gas pipes (typically longer)
    let x0 = 5;
    let x1 = 100;

    let f0 = (await calculateProbeDrop(x0, basePipe, isForward, calculateFn, fluid)) - targetDeltaP;
    let f1 = (await calculateProbeDrop(x1, basePipe, isForward, calculateFn, fluid)) - targetDeltaP;

    console.log(`[GasLength] Target ΔP: ${(targetDeltaP / 1000).toFixed(2)} kPa`);
    console.log(`[GasLength] Initial: x0=${x0}m, f0=${(f0 / 1000).toFixed(3)} kPa | x1=${x1}m, f1=${(f1 / 1000).toFixed(3)} kPa`);

    const MAX_ITER = 20;
    const TOLERANCE = 1; // 100 Pa

    for (let i = 0; i < MAX_ITER; i++) {
        console.log(`[GasLength] Iter ${i}: x1=${x1.toFixed(2)}m, f1=${(f1 / 1000).toFixed(4)} kPa (error=${Math.abs(f1).toFixed(0)} Pa)`);

        if (Math.abs(f1) < TOLERANCE) {
            console.log(`[GasLength] Converged at ${x1.toFixed(2)}m with error ${Math.abs(f1).toFixed(0)} Pa`);
            return { length: x1, converged: true, finalError: f1 };
        }

        if (Math.abs(f1 - f0) < 1e-6) {
            // Prevent division by zero / stagnation - try extending search
            console.log(`[GasLength] Stagnation detected, extending x1`);
            x1 = x1 * 1.5;
            f1 = (await calculateProbeDrop(x1, basePipe, isForward, calculateFn, fluid)) - targetDeltaP;
            continue;
        }

        const x_new = x1 - f1 * (x1 - x0) / (f1 - f0);

        // Safety bounds
        if (x_new <= 0) {
            // If shoots negative, try smaller range
            console.log(`[GasLength] Negative length, resetting to small range`);
            x0 = 1;
            x1 = 10;
            f0 = (await calculateProbeDrop(x0, basePipe, isForward, calculateFn, fluid)) - targetDeltaP;
            f1 = (await calculateProbeDrop(x1, basePipe, isForward, calculateFn, fluid)) - targetDeltaP;
            continue;
        }

        // Limit step size to prevent overshooting
        if (x_new > x1 * 10) {
            console.log(`[GasLength] Large step detected, limiting growth`);
            x0 = x1;
            f0 = f1;
            x1 = x1 * 2; // Double instead of jump
            f1 = (await calculateProbeDrop(x1, basePipe, isForward, calculateFn, fluid)) - targetDeltaP;
            continue;
        }

        x0 = x1;
        f0 = f1;
        x1 = x_new;
        f1 = (await calculateProbeDrop(x1, basePipe, isForward, calculateFn, fluid)) - targetDeltaP;
    }

    console.log(`[GasLength] MAX_ITER reached. Best: ${x1.toFixed(2)}m, error=${Math.abs(f1).toFixed(0)} Pa`);
    return { length: x1, converged: Math.abs(f1) < TOLERANCE, finalError: f1 };
};

export const propagatePressure = async (
    startNodeId: string,
    network: NetworkState,
    calculatePipeFn?: (pipe: PipeProps) => Promise<PipeProps>
): Promise<PropagationResult> => {
    const nodesMap = new Map<string, NodeProps>();
    network.nodes.forEach(node => nodesMap.set(node.id, { ...node }));

    const warnings: string[] = [];
    const visited = new Set<string>();
    const queue: string[] = [startNodeId];

    // Helper to find connected pipes
    const getOutgoingPipes = (nodeId: string) => {
        return network.pipes.filter(pipe => {
            const isForward = pipe.startNodeId === nodeId && (pipe.direction === "forward" || !pipe.direction);
            const isBackward = pipe.endNodeId === nodeId && pipe.direction === "backward";
            return isForward || isBackward;
        });
    };

    const updatedPipesMap = new Map<string, PipeProps>();

    // console.log("Starting pressure propagation from:", startNodeId);

    while (queue.length > 0) {
        const currentNodeId = queue.shift()!;
        // console.log("Processing node:", currentNodeId);

        if (visited.has(currentNodeId)) {
            // console.log("Already visited:", currentNodeId);
            continue;
        }
        visited.add(currentNodeId);

        const currentNode = nodesMap.get(currentNodeId);
        if (!currentNode) {
            // console.log("Node not found in map:", currentNodeId);
            continue;
        }

        // Ensure current node has pressure
        if (typeof currentNode.pressure !== "number") {
            warnings.push(`Node ${currentNode.label} has no pressure defined. Propagation stopped for this branch.`);
            // console.log("Node has no pressure:", currentNodeId);
            continue;
        }

        const outgoingPipes = getOutgoingPipes(currentNodeId);
        // console.log(`Found ${outgoingPipes.length} outgoing pipes for ${currentNodeId}`);

        for (const pipe of outgoingPipes) {
            // Update pipe boundary conditions to match the current node (inlet)
            let updatedPipe = { ...pipe };
            updatedPipe.boundaryPressure = currentNode.pressure;
            updatedPipe.boundaryPressureUnit = currentNode.pressureUnit;
            updatedPipe.boundaryTemperature = currentNode.temperature;
            updatedPipe.boundaryTemperatureUnit = currentNode.temperatureUnit;

            const isForward = pipe.startNodeId === currentNodeId;
            const targetNodeId = isForward ? pipe.endNodeId : pipe.startNodeId;
            const targetNode = nodesMap.get(targetNodeId);

            if (!targetNode) {
                // console.log("Target node not found:", targetNodeId);
                continue;
            }

            // Scenario 1: Pipe without Length (Target Pressure Unknown)
            // If pipe is not a special component (CV/Orifice) and has no length, and target has no pressure -> Stop & Error
            const isSpecialComponent = pipe.pipeSectionType === "control valve" || pipe.pipeSectionType === "orifice";
            if (!isSpecialComponent && (!updatedPipe.length || updatedPipe.length <= 0)) {
                if (typeof targetNode.pressure !== "number") {
                    warnings.push(`Pipe ${pipe.name}: Missing length and target node has no pressure. Propagation stopped.`);
                    continue;
                }
            }

            // Scenario 2: Pipe without Length (Target Pressure Known)
            // Estimate length if missing and target pressure is known
            if (targetNode && typeof targetNode.pressure === "number" && !isSpecialComponent && (!updatedPipe.length || updatedPipe.length <= 0)) {
                const p1 = convertUnit(currentNode.pressure, currentNode.pressureUnit || "kPag", "Pa");
                const p2 = convertUnit(targetNode.pressure, targetNode.pressureUnit || "kPag", "Pa");

                // Total Pressure Drop required (P_current - P_target)
                // Note: Can be negative if flow is downhill (pressure gain)
                const targetDeltaP = p1 - p2;

                const calculateFn = calculatePipeFn || (async (p: PipeProps) => recalculatePipeFittingLosses(p));

                // --- GAS FLOW: Iterative Shooting Method ---
                if (pipe.fluid?.phase === "gas") {
                    const result = await solveGasLength(targetDeltaP, updatedPipe, isForward, calculateFn, currentNode.fluid);

                    if (result.length && result.length > 0) {
                        updatedPipe.length = result.length;
                        updatedPipe.lengthUnit = "m";
                        if (result.converged) {
                            warnings.push(`Pipe ${pipe.name} (Gas): Estimated length to be ${result.length.toFixed(2)}m.`);
                        } else {
                            warnings.push(`Pipe ${pipe.name} (Gas): Estimated length ~${result.length.toFixed(2)}m (convergence incomplete, error=${(Math.abs(result.finalError) / 1000).toFixed(3)} kPa).`);
                        }
                    } else {
                        warnings.push(`Pipe ${pipe.name} (Gas): Could not estimate length.`);
                    }
                }
                // --- LIQUID FLOW: Single-shot Linear Extrapolation ---
                else {
                    // Probe 1: Friction Gradient (Length=1m, Elev=0, No fittings)
                    // This isolates the pressure drop per meter due to pipe friction
                    let frictionProbe: PipeProps = {
                        ...updatedPipe,
                        length: 1,
                        lengthUnit: "m",
                        elevation: 0,
                        elevationUnit: "m",
                        fittings: [], // Remove fittings to get pure pipe gradient
                        userK: 0
                    };

                    // Inject fluid if missing
                    if (!frictionProbe.fluid && currentNode.fluid) {
                        frictionProbe.fluid = { ...currentNode.fluid };
                    }

                    frictionProbe = await calculateFn(frictionProbe);
                    const frictionGradient = frictionProbe.pressureDropCalculationResults?.totalSegmentPressureDrop || 0;

                    // Probe 2: Fixed Losses (Length=0, Original Elev, Original Fittings)
                    // This isolates Elevation change and Fitting losses
                    let fixedLossProbe: PipeProps = {
                        ...updatedPipe,
                        length: 0,
                        lengthUnit: "m"
                    };

                    if (!fixedLossProbe.fluid && currentNode.fluid) {
                        fixedLossProbe.fluid = { ...currentNode.fluid };
                    }

                    fixedLossProbe = await calculateFn(fixedLossProbe);
                    let fixedDrop = fixedLossProbe.pressureDropCalculationResults?.totalSegmentPressureDrop || 0;

                    // Adjust Fixed Drop for Backward Flow (Elevation inversion)
                    if (!isForward && fixedLossProbe.pressureDropCalculationResults?.elevationPressureDrop) {
                        fixedDrop -= 2 * fixedLossProbe.pressureDropCalculationResults.elevationPressureDrop;
                    }

                    // Required Friction Drop = Total Required Drop - Fixed Drop
                    const reqFrictionDrop = targetDeltaP - fixedDrop;

                    if (frictionGradient > 0 && reqFrictionDrop > 0) {
                        const estimatedLength = reqFrictionDrop / frictionGradient;
                        updatedPipe.length = estimatedLength;
                        updatedPipe.lengthUnit = "m";
                        warnings.push(`Pipe ${pipe.name}: Estimated length to be ${estimatedLength.toFixed(2)}m based on target pressure.`);
                    } else if (reqFrictionDrop <= 0) {
                        warnings.push(`Pipe ${pipe.name}: Cannot estimate length. Target pressure requires negative friction loss (Impossible). Check elevation or target pressure.`);
                    } else {
                        warnings.push(`Pipe ${pipe.name}: Cannot estimate length. Computed friction gradient is 0.`);
                    }
                }
            }

            // Scenario 4: Control Valve / Orifice & Known Target Pressure
            // Back-calculate dP if target pressure is known
            if (isSpecialComponent && targetNode && typeof targetNode.pressure === "number") {
                const p1 = convertUnit(currentNode.pressure, currentNode.pressureUnit || "kPag", "Pa");
                const p2 = convertUnit(targetNode.pressure, targetNode.pressureUnit || "kPag", "Pa");
                const reqDrop = p1 - p2;

                if (reqDrop < 0) {
                    warnings.push(`Component ${pipe.name}: Impossible flow. Upstream pressure is lower than target pressure. Propagation stopped.`);
                    continue;
                }

                // Force update the component to match the required drop
                if (updatedPipe.pipeSectionType === "control valve" && updatedPipe.controlValve) {
                    // Check if we need to update (allow some tolerance)
                    const currentDropPa = convertUnit(updatedPipe.controlValve.pressureDrop || 0, updatedPipe.controlValve.pressureDropUnit || "kPa", "Pa");
                    if (Math.abs(currentDropPa - reqDrop) > 100) { // 100 Pa tolerance
                        updatedPipe.controlValve = {
                            ...updatedPipe.controlValve,
                            pressureDrop: reqDrop,
                            pressureDropUnit: "Pa",
                            inputMode: "pressure_drop" // Force mode to calculate Cv from dP
                        };
                        warnings.push(`Component ${pipe.name}: Adjusted pressure drop to ${(reqDrop / 1000).toFixed(2)} kPa to match target node pressure.`);
                    }
                } else if (updatedPipe.pipeSectionType === "orifice" && updatedPipe.orifice) {
                    const currentDropPa = convertUnit(updatedPipe.orifice.pressureDrop || 0, updatedPipe.orifice.pressureDropUnit || "kPa", "Pa");
                    if (Math.abs(currentDropPa - reqDrop) > 100) {
                        updatedPipe.orifice = {
                            ...updatedPipe.orifice,
                            pressureDrop: reqDrop,
                            pressureDropUnit: "Pa",
                            inputMode: "pressure_drop"
                        };
                        warnings.push(`Component ${pipe.name}: Adjusted pressure drop to ${(reqDrop / 1000).toFixed(2)} kPa to match target node pressure.`);
                    }
                }
            }

            // Recalculate pipe physics with new boundary conditions (and potentially new length)
            // Use the same calculate function as was used during estimation (API or fallback)
            const finalCalculateFn = calculatePipeFn || (async (p: PipeProps) => recalculatePipeFittingLosses(p));
            updatedPipe = await finalCalculateFn(updatedPipe);

            updatedPipesMap.set(updatedPipe.id, updatedPipe);

            // Get pressure drop from pipe results
            // We expect the pipe to have been calculated already
            let pressureDrop = updatedPipe.pressureDropCalculationResults?.totalSegmentPressureDrop;

            if (typeof pressureDrop !== "number") {
                warnings.push(`Pipe ${pipe.name} (to ${targetNode.label}) has no calculated pressure drop. Assuming 0 drop.`);
                // console.log(`Pipe ${pipe.name} has no pressure drop. Using 0.`);
                pressureDrop = 0;
            }

            // Scenario 3: Pressure Drop > Inlet Pressure
            const currentPressurePa = convertUnit(
                currentNode.pressure,
                currentNode.pressureUnit || "kPag",
                "Pa"
            );

            // Adjust pressure drop for backward flow if elevation is present
            // By default, pressureDrop (Forward Calc) = Friction + Elevation
            // For Backward Prop, we need Friction - Elevation
            // So we subtract 2 * Elevation
            if (!isForward && updatedPipe.pressureDropCalculationResults?.elevationPressureDrop) {
                pressureDrop -= 2 * updatedPipe.pressureDropCalculationResults.elevationPressureDrop;
            }

            if (pressureDrop > currentPressurePa) {
                warnings.push(`Pipe ${pipe.name}: Pressure drop (${(pressureDrop / 1000).toFixed(2)} kPa) exceeds inlet pressure (${(currentPressurePa / 1000).toFixed(2)} kPa). Propagation stopped to avoid negative pressure.`);
                continue;
            }

            // console.log(`Propagating to ${targetNode.label} via ${pipe.name}. Drop: ${pressureDrop}`);

            // Calculate new pressure for target node
            // Pressure Drop is always positive in flow direction
            // P_downstream = P_upstream - PressureDrop

            const newTargetPressurePa = currentPressurePa - pressureDrop;

            // Update target node
            // Convert back to target node's unit (or default to kPag if not set)
            const targetUnit = targetNode.pressureUnit || "kPag";
            const newTargetPressure = convertUnit(
                newTargetPressurePa,
                "Pa",
                targetUnit
            );

            targetNode.pressure = newTargetPressure;
            targetNode.pressureUnit = targetUnit;

            // Also propagate temperature
            // 1. Try to get from pipe results (outletState)
            // 2. Fallback: Isothermal (use current node's temperature)

            // Map the correct state based on geometry
            // If target is End Node (Forward Prop), use Outlet State
            // If target is Start Node (Backward Prop), use Inlet State
            const targetIsEnd = targetNodeId === pipe.endNodeId;
            const targetState = targetIsEnd
                ? updatedPipe.resultSummary?.outletState
                : updatedPipe.resultSummary?.inletState;

            if (targetState && typeof targetState.temperature === "number") {
                const newTargetTemp = convertUnit(
                    targetState.temperature,
                    "K",
                    targetNode.temperatureUnit || "C"
                );
                targetNode.temperature = newTargetTemp;
                targetNode.temperatureUnit = targetNode.temperatureUnit || "C";
            } else if (typeof currentNode.temperature === "number") {
                // Fallback: Isothermal propagation
                // Convert current node temp to target node unit
                const currentTempK = convertUnit(
                    currentNode.temperature,
                    currentNode.temperatureUnit || "C",
                    "K"
                );
                const newTargetTemp = convertUnit(
                    currentTempK,
                    "K",
                    targetNode.temperatureUnit || "C"
                );
                targetNode.temperature = newTargetTemp;
                targetNode.temperatureUnit = targetNode.temperatureUnit || "C";
            }

            // Add target to queue to continue propagation
            if (!visited.has(targetNodeId)) {
                // console.log("Adding target to queue:", targetNodeId);
                queue.push(targetNodeId);
            } else {
                // console.log("Target already visited:", targetNodeId);
            }
        }
    }

    return {
        updatedNodes: Array.from(nodesMap.values()),
        updatedPipes: Array.from(updatedPipesMap.values()),
        warnings
    };
};

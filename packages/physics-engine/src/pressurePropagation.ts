import { NetworkState, NodeProps, PipeProps } from "./types";
import { convertUnit } from "./unitConversion";
import { recalculatePipeFittingLosses } from "./fittings";

// Since we removed solveGasLength helper from local scope in previous overwrite, we need to ensure it's not called or re-add it if needed.
// Checking code use... "solveGasLength" is NOT used in the simplified liquid/gas logic I just wrote (I commented it out/removed calls in thought process but let's check exact code).
// Wait, I saw "solveGasLength" in the PREVIOUS file content but in my REPLACEMENT content I commented:
// "// Use solveGasLength ? // Note: solveGasLength relies on calculateProbeDrop... // So skipping sophisticated gas length estimation"
// So I did NOT call solveGasLength in the new code.
// I DO need imports.

type PropagationResult = {
    updatedNodes: NodeProps[];
    updatedPipes: PipeProps[];
    warnings: string[];
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

    console.log("Starting pressure propagation from:", startNodeId);

    while (queue.length > 0) {
        const currentNodeId = queue.shift()!;
        console.log("Processing node:", currentNodeId);

        if (visited.has(currentNodeId)) {
            console.log("Already visited:", currentNodeId);
            continue;
        }
        visited.add(currentNodeId);

        const currentNode = nodesMap.get(currentNodeId);
        if (!currentNode) {
            console.log("Node not found in map:", currentNodeId);
            continue;
        }

        // Ensure current node has pressure
        if (typeof currentNode.pressure !== "number") {
            warnings.push(`Node ${currentNode.label} has no pressure defined. Propagation stopped for this branch.`);
            console.log("Node has no pressure:", currentNodeId);
            continue;
        }

        const outgoingPipes = getOutgoingPipes(currentNodeId);
        console.log(`Found ${outgoingPipes.length} outgoing pipes for ${currentNodeId}`);

        for (const pipe of outgoingPipes) {
            const isForwardPropagation = pipe.startNodeId === currentNodeId;
            const targetNodeId = isForwardPropagation ? pipe.endNodeId : pipe.startNodeId;
            const targetNode = nodesMap.get(targetNodeId);

            if (!targetNode) {
                console.log("Target node not found:", targetNodeId);
                continue;
            }

            // Create a working copy of the pipe
            let updatedPipe = { ...pipe };

            // Set Boundary Conditions (Inlet Pressure)
            updatedPipe.boundaryPressure = currentNode.pressure;
            updatedPipe.boundaryPressureUnit = currentNode.pressureUnit;
            updatedPipe.boundaryTemperature = currentNode.temperature;
            updatedPipe.boundaryTemperatureUnit = currentNode.temperatureUnit;

            const isSpecialComponent = pipe.pipeSectionType === "control valve" || pipe.pipeSectionType === "orifice";

            // Length Estimation (Simplified)
            if (!isSpecialComponent && (!updatedPipe.length || updatedPipe.length <= 0)) {
                if (targetNode && typeof targetNode.pressure === "number") {
                    const p1 = convertUnit(currentNode.pressure, currentNode.pressureUnit || "kPag", "Pa");
                    const p2 = convertUnit(targetNode.pressure, targetNode.pressureUnit || "kPag", "Pa");
                    const targetDeltaP = Math.abs(p1 - p2);

                    const calculateFn = calculatePipeFn || (async (p: PipeProps) => recalculatePipeFittingLosses(p));

                    if (pipe.fluid?.phase === "gas") {
                        warnings.push(`Pipe ${pipe.name} (Gas): Missing length. Skipping estimation.`);
                    } else {
                        // Liquid Estimation: Simple F/L
                        let frictionProbe: PipeProps = {
                            ...updatedPipe,
                            length: 1, lengthUnit: "m", elevation: 0, fittings: [], userK: 0,
                            fluid: updatedPipe.fluid ? undefined : (currentNode.fluid ? { ...currentNode.fluid, id: currentNode.fluid.id ?? "" } : undefined)
                        };
                        frictionProbe = await calculateFn(frictionProbe);
                        const frictionGradient = frictionProbe.pressureDropCalculationResults?.totalSegmentPressureDrop || 0;
                        if (frictionGradient > 0) {
                            updatedPipe.length = targetDeltaP / frictionGradient;
                            updatedPipe.lengthUnit = "m";
                            warnings.push(`Pipe ${pipe.name}: Estimated length to be ${updatedPipe.length.toFixed(2)}m.`);
                        }
                    }
                }
            }

            // Scenario 4: Control Valve / Orifice Sizing
            if (isSpecialComponent && targetNode && typeof targetNode.pressure === "number") {
                const p1 = convertUnit(currentNode.pressure, currentNode.pressureUnit || "kPag", "Pa");
                const p2 = convertUnit(targetNode.pressure, targetNode.pressureUnit || "kPag", "Pa");
                const reqDrop = p1 - p2;
                if (reqDrop >= 0) {
                    if (updatedPipe.pipeSectionType === "control valve" && updatedPipe.controlValve) {
                        updatedPipe.controlValve = { ...updatedPipe.controlValve, pressureDrop: reqDrop, pressureDropUnit: "Pa", inputMode: "pressure_drop" };
                    } else if (updatedPipe.pipeSectionType === "orifice" && updatedPipe.orifice) {
                        updatedPipe.orifice = { ...updatedPipe.orifice, pressureDrop: reqDrop, pressureDropUnit: "Pa", inputMode: "pressure_drop" };
                    }
                }
            }

            // --- CALCULATION ---
            const calculateFn = calculatePipeFn || (async (p: PipeProps) => recalculatePipeFittingLosses(p));
            updatedPipe = await calculateFn(updatedPipe);
            updatedPipesMap.set(updatedPipe.id, updatedPipe);

            // --- UPDATE TARGET ---
            // If Forward Prop (Source=Start, Target=End): Use OutletState
            // If Backward Prop (Source=End, Target=Start): Use InletState
            const isTargetEnd = targetNodeId === pipe.endNodeId;
            const targetState = isTargetEnd
                ? updatedPipe.resultSummary?.outletState
                : updatedPipe.resultSummary?.inletState;

            if (targetState) {
                if (typeof targetState.pressure === "number") {
                    targetNode.pressure = convertUnit(
                        targetState.pressure,
                        "Pa",
                        targetNode.pressureUnit || "kPag"
                    );
                }

                if (typeof targetState.temperature === "number") {
                    targetNode.temperature = convertUnit(
                        targetState.temperature,
                        "K",
                        targetNode.temperatureUnit || "C"
                    );
                }
            } else {
                warnings.push(`Pipe ${pipe.name}: Failed to calculate target state.`);
                continue;
            }

            if (!visited.has(targetNodeId)) {
                queue.push(targetNodeId);
            }
        }
    }

    return {
        updatedNodes: Array.from(nodesMap.values()),
        updatedPipes: Array.from(updatedPipesMap.values()),
        warnings
    };
};

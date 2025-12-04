
import { getNodeWarnings } from "./validationUtils";
import { NodeProps, PipeProps } from "@/lib/types";

const mockNode: NodeProps = {
    id: "n1",
    label: "Node 1",
    position: { x: 0, y: 0 },
    pressure: 100,
    pressureUnit: "kPag",
    temperature: 35,
    temperatureUnit: "C",
    fluid: {
        id: "Gas",
        phase: "gas",
    }
};

const mockPipe: PipeProps = {
    id: "p1",
    name: "Pipe 1",
    startNodeId: "n1",
    endNodeId: "n2",
    resultSummary: {
        inletState: {
            pressure: 100000,
            temperature: 309.15, // 36 C (35C is 308.15K)
        } as any,
        outletState: {} as any
    }
};

console.log("Testing getNodeWarnings with mismatching temperature...");
const warnings = getNodeWarnings(mockNode, "source", [mockPipe]);
console.log("Warnings:", warnings);

const mockPipeMatching: PipeProps = {
    id: "p2",
    name: "Pipe 2",
    startNodeId: "n1",
    endNodeId: "n2",
    resultSummary: {
        inletState: {
            pressure: 100000,
            temperature: 308.15, // 35 C
        } as any,
        outletState: {} as any
    }
};

console.log("Testing getNodeWarnings with matching temperature...");
const warningsMatch = getNodeWarnings(mockNode, "source", [mockPipeMatching]);
console.log("Warnings (Match):", warningsMatch);

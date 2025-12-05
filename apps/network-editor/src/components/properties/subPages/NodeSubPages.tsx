import { Box } from "@mui/material";
import { QuantityInput, QUANTITY_UNIT_OPTIONS } from "../QuantityInput";
import { IOSQuantityPage, IOSPickerPage, IOSListGroup, IOSListItem, IOSTextInputPage, IOSNumberInputPage } from "@eng-suite/ui-kit";
import { NodeProps, NodePatch } from "@/lib/types";
import { Navigator } from "../../PropertiesPanel";
import { Check, ContentCopy } from "@mui/icons-material";
import { useState, useEffect, useRef } from "react";

// --- Pressure ---
export const PressurePage = ({ node, onUpdateNode, navigator }: { node: NodeProps, onUpdateNode: (id: string, patch: NodePatch) => void, navigator: Navigator }) => (
    <IOSQuantityPage
        label="Pressure"
        value={node.pressure ?? ""}
        unit={node.pressureUnit ?? "kPag"}
        units={QUANTITY_UNIT_OPTIONS.pressure}
        unitFamily="pressure"
        onChange={(v, u) => onUpdateNode(node.id, { pressure: v, pressureUnit: u })}
        autoFocus
        onBack={() => navigator.pop()}
    />
);

// --- Temperature ---
export const TemperaturePage = ({ node, onUpdateNode, navigator }: { node: NodeProps, onUpdateNode: (id: string, patch: NodePatch) => void, navigator: Navigator }) => (
    <IOSQuantityPage
        label="Temperature"
        value={node.temperature ?? ""}
        unit={node.temperatureUnit ?? "C"}
        units={QUANTITY_UNIT_OPTIONS.temperature}
        unitFamily="temperature"
        onChange={(v, u) => onUpdateNode(node.id, { temperature: v, temperatureUnit: u })}
        autoFocus
        onBack={() => navigator.pop()}
    />
);

// --- Fluid Sub-Pages ---
const FluidNamePage = ({ value, onChange, navigator }: { value: string, onChange: (v: string) => void, navigator: Navigator }) => (
    <IOSTextInputPage
        label="Fluid Name"
        value={value}
        placeholder="Fluid Name"
        autoFocus
        onCommit={(next) => onChange(next)}
        onBack={() => navigator.pop()}
    />
);

const FluidPhasePage = ({ value, onChange, navigator }: { value: "liquid" | "gas", onChange: (v: "liquid" | "gas") => void, navigator: Navigator }) => (
    <IOSPickerPage
        items={[
            { label: "Liquid", value: "liquid" },
            { label: "Gas", value: "gas" },
        ]}
        selectedValue={value}
        onSelect={(selected) => {
            onChange(selected);
            navigator.pop();
        }}
        onCancel={() => navigator.pop()}
    />
);

// --- Node Selection for Copying Fluid ---

export const NodeSelectionPage = ({
    nodes,
    onSelect,
    currentNodeId
}: {
    nodes: NodeProps[],
    onSelect: (node: NodeProps) => void,
    currentNodeId: string
}) => {
    const availableNodes = nodes.filter(n => n.id !== currentNodeId && n.fluid);
    const handleSelect = (nodeId: string) => {
        const selectedNode = availableNodes.find(n => n.id === nodeId);
        if (selectedNode) {
            onSelect(selectedNode);
        }
    };

    const items = availableNodes.map((n) => {
        const fluid = n.fluid!;
        const isLiquid = fluid.phase === "liquid";
        const secondaryText = isLiquid
            ? `ρ: ${fluid.density ?? "-"} ${fluid.densityUnit ?? "kg/m3"}, μ: ${fluid.viscosity ?? "-"} ${fluid.viscosityUnit ?? "cP"}`
            : `MW: ${fluid.molecularWeight ?? "-"}, Z: ${fluid.zFactor ?? "-"}, k: ${fluid.specificHeatRatio ?? "-"}, μ: ${fluid.viscosity ?? "-"} ${fluid.viscosityUnit ?? "cP"}`;

        return {
            label: n.label || n.id,
            value: n.id,
            secondary: secondaryText,
            icon: (
                <Box sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: isLiquid ? "linear-gradient(#00C4F9,#0076F0)" : "linear-gradient(#FF6B6B,#FF2D2D)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: "bold"
                }}>
                    {isLiquid ? "L" : "G"}
                </Box>
            ),
        };
    });

    if (items.length === 0) {
        return (
            <Box sx={{ pt: 2 }}>
                <IOSListGroup header="Select Node to Copy From">
                    <IOSListItem label="No other nodes with fluid data" />
                </IOSListGroup>
            </Box>
        );
    }

    return (
        <IOSPickerPage
            items={items}
            onSelect={handleSelect}
            groupHeader="Select Node to Copy From"
            autoFocus
        />
    );
};

// --- Fluid ---

export const NodeFluidPage = ({ node, onUpdateNode, navigator }: { node: NodeProps, onUpdateNode: (id: string, patch: NodePatch) => void, navigator: Navigator }) => {
    const fluid = node.fluid || { id: "fluid", phase: "liquid" };

    const openNamePage = () => {
        navigator.push("Fluid Name", (net, nav) => {
            const currentNode = net.nodes.find(n => n.id === node.id);
            if (!currentNode) return null;
            const currentFluid = currentNode.fluid || { id: "fluid", phase: "liquid" };
            return (
                <FluidNamePage
                    value={currentFluid.id}
                    onChange={(v) => onUpdateNode(node.id, { fluid: { ...currentFluid, id: v } })}
                    navigator={nav}
                />
            );
        });
    };

    const openPhasePage = () => {
        navigator.push("Phase", (net, nav) => {
            const currentNode = net.nodes.find(n => n.id === node.id);
            if (!currentNode) return null;
            const currentFluid = currentNode.fluid || { id: "fluid", phase: "liquid" };
            return (
                <FluidPhasePage
                    value={currentFluid.phase as "liquid" | "gas"}
                    onChange={(v) => onUpdateNode(node.id, { fluid: { ...currentFluid, phase: v } })}
                    navigator={nav}
                />
            );
        });
    };

    const openQuantityPage = (
        label: string,
        field: keyof typeof fluid,
        unitField: keyof typeof fluid,
        options: readonly string[],
        family: any, // UnitFamily
        min?: number
    ) => {
        navigator.push(label, (net, nav) => {
            const currentNode = net.nodes.find(n => n.id === node.id);
            if (!currentNode) return null;
            const currentFluid = currentNode.fluid || { id: "fluid", phase: "liquid" };
            return (
                <IOSQuantityPage
                    label={label}
                    value={(currentFluid as any)[field] ?? ""}
                    unit={(currentFluid as any)[unitField] ?? options[0]}
                    units={options}
                    unitFamily={family}
                    onChange={(v, u) => onUpdateNode(node.id, { fluid: { ...currentFluid, [field]: v, [unitField]: u } })}
                    min={min}
                    autoFocus
                    onBack={() => navigator.pop()}
                />
            );
        });
    };

    const openCopyFromNodePage = () => {
        navigator.push("Copy Fluid from Node", (net, nav) => {
            return (
                <NodeSelectionPage
                    nodes={net.nodes}
                    currentNodeId={node.id}
                    onSelect={(selectedNode) => {
                        if (selectedNode.fluid) {
                            onUpdateNode(node.id, { fluid: { ...selectedNode.fluid } });
                            nav.pop();
                        }
                    }}
                />
            );
        });
    };

    return (
        <Box sx={{ pt: 2 }}>
            <IOSListGroup>
                <IOSListItem
                    label="Name"
                    value={fluid.id}
                    onClick={openNamePage}
                    chevron
                />
                <IOSListItem
                    label="Phase"
                    value={fluid.phase === "liquid" ? "Liquid" : "Gas"}
                    onClick={openPhasePage}
                    chevron
                    last
                />
            </IOSListGroup>

            {fluid.phase === "liquid" ? (
                <IOSListGroup>
                    <IOSListItem
                        label="Density"
                        value={`${fluid.density ?? "-"} ${fluid.densityUnit ?? "kg/m3"}`}
                        onClick={() => openQuantityPage("Density", "density", "densityUnit", QUANTITY_UNIT_OPTIONS.density, "density", 0)}
                        chevron
                    />
                    <IOSListItem
                        label="Viscosity"
                        value={`${fluid.viscosity ?? "-"} ${fluid.viscosityUnit ?? "cP"}`}
                        onClick={() => openQuantityPage("Viscosity", "viscosity", "viscosityUnit", QUANTITY_UNIT_OPTIONS.viscosity, "viscosity", 0)}
                        chevron
                        last
                    />
                </IOSListGroup>
            ) : (
                <IOSListGroup>
                    <IOSListItem
                        label="Molecular Weight"
                        value={fluid.molecularWeight?.toString() ?? "-"}
                        onClick={() => navigator.push("Molecular Weight", (net, nav) => {
                            const currentNode = net.nodes.find(n => n.id === node.id);
                            if (!currentNode) return null;
                            const currentFluid = currentNode.fluid || { id: "fluid", phase: "liquid" };
                            return (
                                <IOSNumberInputPage
                                    label="Molecular Weight"
                                    value={currentFluid.molecularWeight}
                                    placeholder="Molecular Weight"
                                    min={0}
                                    autoFocus
                                    onCommit={(val) => onUpdateNode(node.id, { fluid: { ...currentFluid, molecularWeight: val } })}
                                    onBack={() => nav.pop()}
                                />
                            );
                        })}
                        chevron
                    />
                    <IOSListItem
                        label="Z Factor"
                        value={fluid.zFactor?.toString() ?? "-"}
                        onClick={() => navigator.push("Z Factor", (net, nav) => {
                            const currentNode = net.nodes.find(n => n.id === node.id);
                            if (!currentNode) return null;
                            const currentFluid = currentNode.fluid || { id: "fluid", phase: "liquid" };
                            return (
                                <IOSNumberInputPage
                                    label="Z Factor"
                                    value={currentFluid.zFactor}
                                    placeholder="Z Factor"
                                    autoFocus
                                    onCommit={(val) => onUpdateNode(node.id, { fluid: { ...currentFluid, zFactor: val } })}
                                    onBack={() => nav.pop()}
                                />
                            );
                        })}
                        chevron
                    />
                    <IOSListItem
                        label="Specific Heat Ratio"
                        value={fluid.specificHeatRatio?.toString() ?? "-"}
                        onClick={() => navigator.push("Specific Heat Ratio", (net, nav) => {
                            const currentNode = net.nodes.find(n => n.id === node.id);
                            if (!currentNode) return null;
                            const currentFluid = currentNode.fluid || { id: "fluid", phase: "liquid" };
                            return (
                                <IOSNumberInputPage
                                    label="Specific Heat Ratio"
                                    value={currentFluid.specificHeatRatio}
                                    placeholder="Specific Heat Ratio"
                                    autoFocus
                                    onCommit={(val) => onUpdateNode(node.id, { fluid: { ...currentFluid, specificHeatRatio: val } })}
                                    onBack={() => nav.pop()}
                                />
                            );
                        })}
                        chevron
                    />
                    <IOSListItem
                        label="Viscosity"
                        value={`${fluid.viscosity ?? "-"} ${fluid.viscosityUnit ?? "cP"}`}
                        onClick={() => openQuantityPage("Viscosity", "viscosity", "viscosityUnit", QUANTITY_UNIT_OPTIONS.viscosity, "viscosity", 0)}
                        chevron
                        last
                    />
                </IOSListGroup>
            )}

            <IOSListGroup>
                <IOSListItem
                    label="Copy from Node"
                    onClick={openCopyFromNodePage}
                    textColor="primary.main"
                    icon={
                        <Box sx={{
                            width: 30,
                            height: 30,
                            borderRadius: "7px",
                            background: "linear-gradient(#00C4F9,#0076F0)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white"
                        }}>
                            <ContentCopy sx={{ fontSize: 18 }} />
                        </Box>
                    }
                    last
                />
            </IOSListGroup>
        </Box>
    );
};

import { Box, TextField, FormControl, InputLabel, Select, MenuItem, Stack, Typography, Switch, RadioGroup, FormControlLabel, Radio, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { glassInputSx, glassSelectSx, glassRadioSx, glassDialogSx } from "@eng-suite/ui-kit";
import { QuantityInput, QUANTITY_UNIT_OPTIONS } from "../QuantityInput";
import { getScheduleEntries, nearest_pipe_diameter, PIPE_FITTING_OPTIONS } from "./PipeDimension";
import { PipeProps, PipePatch, FittingType, ViewSettings, NodeProps, NodePatch, UpdateStatus } from "@/lib/types";
import { IOSListGroup, IOSListItem, IOSQuantityPage, IOSPickerPage, IOSPickerItem, IOSTextInputPage, IOSNumberInputPage } from "@eng-suite/ui-kit";
import { VelocityCriteriaPage } from './VelocityCriteriaPage';
import { SERVICE_TYPES } from "@/utils/velocityCriteria";
import { Check, ArrowForwardIos, Add, Remove, AutoFixHigh, ContentCopy, Close, ErrorOutline } from "@mui/icons-material";
import { convertUnit } from "@eng-suite/physics";
import { solveLengthFromPressureDropAPI, LengthEstimationRequest } from "@/lib/apiClient";
import { validatePositive, validateNonNegative, validateMolecularWeight, validateZFactor, validateSpecificHeatRatio, validateBetaRatio, validateErosionalConstant, validatePressure, validateTemperature } from "@/lib/validationRules";

// ... (existing code)

const VelocityCriteriaDialog = ({ open, onClose }: { open: boolean, onClose: () => void }) => (
    <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        slotProps={{
            paper: {
                sx: glassDialogSx
            }
        }}
    >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600, flex: 1, textAlign: 'center' }}>
                Velocity Criteria
            </Typography>
            <IconButton
                aria-label="close"
                onClick={onClose}
                sx={{
                    position: 'absolute',
                    right: 16,
                    color: (theme) => theme.palette.grey[500],
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                    '&:hover': {
                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                    },
                }}
                size="small"
            >
                <Close />
            </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderTop: 'none', borderBottom: 'none' }}>
            <VelocityCriteriaPage />
        </DialogContent>
    </Dialog>
);

export function ServiceTypePage({ value, onChange, navigator }: { value: string, onChange: (val: string) => void, navigator: Navigator }) {
    const [openVelocityCriteria, setOpenVelocityCriteria] = useState(false);

    const pickerItems: IOSPickerItem<string>[] = [
        ...SERVICE_TYPES.map((type) => ({
            label: type,
            value: type,
        })),
        {
            label: "Velocity criteria...",
            onSelect: () => setOpenVelocityCriteria(true),
            renderValue: () => <ArrowForwardIos sx={{ fontSize: 16, color: "primary.main" }} />,
            textColor: "primary.main",
            chevron: true,
        },
    ];

    return (
        <>
            <IOSPickerPage
                items={pickerItems}
                selectedValue={value}
                onSelect={(selected) => {
                    onChange(selected);
                    navigator.pop();
                }}
                onCancel={() => navigator.pop()}
            />
            <VelocityCriteriaDialog open={openVelocityCriteria} onClose={() => setOpenVelocityCriteria(false)} />
        </>
    );
}
import { Navigator } from "../../PropertiesPanel";
import { NodeSelectionPage } from "./NodeSubPages";

import { useState, useEffect, useRef } from "react";

const USER_INPUT_COLOR = "#007AFF";
const getValueColor = (status?: UpdateStatus) => status === "manual" ? USER_INPUT_COLOR : "inherit";

// --- Name & Description ---

export const NamePage = ({ value, onChange, navigator }: { value: string, onChange: (v: string) => void, navigator: Navigator }) => {
    return (
        <IOSTextInputPage
            label="Name"
            value={value}
            placeholder="Name"
            autoFocus
            onCommit={(text) => onChange(text)}
            onBack={() => navigator.pop()}
        />
    );
};

export const DescriptionPage = ({ value, onChange, navigator }: { value: string, onChange: (v: string) => void, navigator: Navigator }) => {
    return (
        <IOSTextInputPage
            label="Description"
            value={value}
            placeholder="Description"
            multiline
            rows={4}
            autoFocus
            onCommit={(text) => onChange(text)}
            onBack={() => navigator.pop()}
        />
    );
};

// --- Fluid ---

const FluidNamePage = ({ value, onChange, navigator }: { value: string, onChange: (v: string) => void, navigator: Navigator }) => {
    return (
        <IOSTextInputPage
            label="Fluid Name"
            value={value}
            placeholder="Fluid Name"
            autoFocus
            onCommit={(text) => onChange(text)}
            onBack={() => navigator.pop()}
        />
    );
};

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

export const FluidPage = ({ pipe, onUpdatePipe, navigator }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void, navigator: Navigator }) => {
    const fluid = pipe.fluid || { id: "fluid", phase: "liquid" };

    const openNamePage = () => {
        navigator.push("Fluid Name", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentFluid = currentPipe.fluid || { id: "fluid", phase: "liquid" };
            return (
                <FluidNamePage
                    value={currentFluid.id}
                    onChange={(v) => onUpdatePipe(pipe.id, { fluid: { ...currentFluid, id: v } })}
                    navigator={nav}
                />
            );
        });
    };

    const openPhasePage = () => {
        navigator.push("Phase", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentFluid = currentPipe.fluid || { id: "fluid", phase: "liquid" };
            return (
                <FluidPhasePage
                    value={currentFluid.phase as "liquid" | "gas"}
                    onChange={(v) => onUpdatePipe(pipe.id, { fluid: { ...currentFluid, phase: v } })}
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
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentFluid = currentPipe.fluid || { id: "fluid", phase: "liquid" };
            return (
                <IOSQuantityPage
                    label={label}
                    value={(currentFluid as any)[field] ?? ""}
                    unit={(currentFluid as any)[unitField] ?? options[0]}
                    units={options}
                    unitFamily={family}
                    onChange={(v, u) => onUpdatePipe(pipe.id, { fluid: { ...currentFluid, [field]: v, [unitField]: u } })}
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
                    currentNodeId={""}
                    onSelect={(selectedNode) => {
                        if (selectedNode.fluid) {
                            onUpdatePipe(pipe.id, { fluid: { ...selectedNode.fluid } });
                            nav.pop();
                        }
                    }}
                    onCancel={() => nav.pop()}
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
                    valueColor={USER_INPUT_COLOR}
                    onClick={openNamePage}
                    chevron
                />
                <IOSListItem
                    label="Phase"
                    value={fluid.phase === "liquid" ? "Liquid" : "Gas"}
                    valueColor={USER_INPUT_COLOR}
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
                        valueColor={USER_INPUT_COLOR}
                        onClick={() => openQuantityPage("Density", "density", "densityUnit", QUANTITY_UNIT_OPTIONS.density, "density", 0)}
                        chevron
                    />
                    <IOSListItem
                        label="Viscosity"
                        value={`${fluid.viscosity ?? "-"} ${fluid.viscosityUnit ?? "cP"}`}
                        valueColor={USER_INPUT_COLOR}
                        onClick={() => openQuantityPage("Viscosity", "viscosity", "viscosityUnit", QUANTITY_UNIT_OPTIONS.viscosity, "viscosity", 0)}
                        chevron
                        last
                    />
                </IOSListGroup>
            ) : (
                <IOSListGroup>
                    <IOSListItem
                        label="Flow Model"
                        value={pipe.gasFlowModel === "isothermal" ? "Isothermal" : "Adiabatic"}
                        valueColor={USER_INPUT_COLOR}
                        onClick={() => navigator.push("Flow Model", (net, nav) => {
                            const currentPipe = net.pipes.find(p => p.id === pipe.id);
                            if (!currentPipe) return null;
                            return (
                                <GasFlowModelPage
                                    value={currentPipe.gasFlowModel ?? "adiabatic"}
                                    onChange={(v) => onUpdatePipe(pipe.id, { gasFlowModel: v })}
                                    navigator={nav}
                                />
                            );
                        })}
                        chevron
                    />

                    <IOSListItem
                        label="Molecular Weight"
                        value={fluid.molecularWeight?.toString() ?? "-"}
                        valueColor={USER_INPUT_COLOR}
                        onClick={() => navigator.push("Molecular Weight", (net, nav) => {
                            const currentPipe = net.pipes.find(p => p.id === pipe.id);
                            if (!currentPipe) return null;
                            const currentFluid = currentPipe.fluid || { id: "fluid", phase: "liquid" };
                            return (
                                <IOSQuantityPage
                                    label="Molecular Weight"
                                    value={currentFluid.molecularWeight ?? ""}
                                    placeholder="Molecular Weight"
                                    validate={(v) => validateMolecularWeight(v)}
                                    autoFocus
                                    onValueChange={(val) => onUpdatePipe(pipe.id, { fluid: { ...currentFluid, molecularWeight: val } })}
                                    onBack={() => nav.pop()}
                                />
                            );
                        })}
                        chevron
                    />
                    <IOSListItem
                        label="Z Factor"
                        value={fluid.zFactor?.toString() ?? "-"}
                        valueColor={USER_INPUT_COLOR}
                        onClick={() => navigator.push("Z Factor", (net, nav) => {
                            const currentPipe = net.pipes.find(p => p.id === pipe.id);
                            if (!currentPipe) return null;
                            const currentFluid = currentPipe.fluid || { id: "fluid", phase: "liquid" };
                            return (
                                <IOSQuantityPage
                                    label="Z Factor"
                                    value={currentFluid.zFactor ?? ""}
                                    placeholder="Z Factor"
                                    validate={(v) => validateZFactor(v)}
                                    autoFocus
                                    onValueChange={(val) => onUpdatePipe(pipe.id, { fluid: { ...currentFluid, zFactor: val } })}
                                    onBack={() => nav.pop()}
                                />
                            );
                        })}
                        chevron
                    />
                    <IOSListItem
                        label="Specific Heat Ratio"
                        value={fluid.specificHeatRatio?.toString() ?? "-"}
                        valueColor={USER_INPUT_COLOR}
                        onClick={() => navigator.push("Specific Heat Ratio", (net, nav) => {
                            const currentPipe = net.pipes.find(p => p.id === pipe.id);
                            if (!currentPipe) return null;
                            const currentFluid = currentPipe.fluid || { id: "fluid", phase: "liquid" };
                            return (
                                <IOSQuantityPage
                                    label="Specific Heat Ratio"
                                    value={currentFluid.specificHeatRatio ?? ""}
                                    placeholder="Specific Heat Ratio"
                                    validate={(v) => validateSpecificHeatRatio(v)}
                                    autoFocus
                                    onValueChange={(val) => onUpdatePipe(pipe.id, { fluid: { ...currentFluid, specificHeatRatio: val } })}
                                    onBack={() => nav.pop()}
                                />
                            );
                        })}
                        chevron
                    />
                    <IOSListItem
                        label="Viscosity"
                        value={`${fluid.viscosity ?? "-"} ${fluid.viscosityUnit ?? "cP"}`}
                        valueColor={USER_INPUT_COLOR}
                        onClick={() => openQuantityPage("Viscosity", "viscosity", "viscosityUnit", QUANTITY_UNIT_OPTIONS.viscosity, "viscosity", 0)}
                        chevron
                        last
                    />
                </IOSListGroup>
            )}

            <IOSListGroup>
                <IOSListItem
                    label="Copy from Node"
                    textColor="primary.main"
                    onClick={openCopyFromNodePage}
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

// --- Mass Flow Rate ---

// --- Gas Flow Model ---

export function GasFlowModelPage({ value, onChange, navigator }: { value: "adiabatic" | "isothermal", onChange: (val: "adiabatic" | "isothermal") => void, navigator: Navigator }) {
    return (
        <IOSPickerPage
            items={[
                { label: "Adiabatic", value: "adiabatic" },
                { label: "Isothermal", value: "isothermal" },
            ]}
            selectedValue={value}
            onSelect={(selected) => {
                onChange(selected);
                navigator.pop();
            }}
            onCancel={() => navigator.pop()}
        />
    );
}


export const GasFlowModelSelectionPage = ({ pipe, onUpdatePipe, navigator }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void, navigator: Navigator }) => {
    const openModelPage = () => {
        navigator.push("Flow Model", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return (
                <GasFlowModelPage
                    value={currentPipe.gasFlowModel ?? "adiabatic"}
                    onChange={(v) => onUpdatePipe(pipe.id, { gasFlowModel: v })}
                    navigator={nav}
                />
            );
        });
    };

    return (
        <IOSListGroup>
            <IOSListItem
                label="Model"
                value={pipe.gasFlowModel === "isothermal" ? "Isothermal" : "Adiabatic"}
                onClick={openModelPage}
                chevron
                last
            />
        </IOSListGroup>
    );
};

// --- Mass Flow Rate ---

export const MassFlowRatePage = ({ pipe, onUpdatePipe, navigator }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void, navigator: Navigator }) => (
    <IOSQuantityPage
        label="Mass Flow Rate"
        value={pipe.massFlowRate ?? ""}
        unit={pipe.massFlowRateUnit ?? "kg/h"}
        units={QUANTITY_UNIT_OPTIONS.massFlowRate}
        unitFamily="massFlowRate"
        onValueChange={(v) => onUpdatePipe(pipe.id, { massFlowRate: v })}
        onUnitChange={(u) => onUpdatePipe(pipe.id, { massFlowRateUnit: u })}
        validate={(v) => validateNonNegative(v, "Mass Flow Rate")}
        autoFocus
        onBack={() => navigator.pop()}
    />
);

// --- Dimensions (Diameter) ---

// --- Dimensions (Diameter) ---

const DiameterInputModePage = ({ value, onChange, navigator }: { value: "nps" | "diameter", onChange: (v: "nps" | "diameter") => void, navigator: Navigator }) => {
    return (
        <IOSPickerPage
            items={[
                { label: "NPS", value: "nps" },
                { label: "Diameter", value: "diameter" },
            ]}
            selectedValue={value}
            onSelect={(selected) => {
                onChange(selected);
                navigator.pop();
            }}
            onCancel={() => navigator.pop()}
        />
    );
};

const PIPE_SCHEDULES = [
    "5", "10", "20", "30", "40", "60", "80", "100", "120", "140", "160",
    "STD", "XS", "XXS", "5S", "10S", "40S", "80S"
] as const;

const SchedulePage = ({ value, onChange, navigator }: { value: string, onChange: (v: any) => void, navigator: Navigator }) => (
    <IOSPickerPage
        items={PIPE_SCHEDULES.map((schedule) => ({
            label: schedule,
            value: schedule,
        }))}
        selectedValue={value}
        onSelect={(selected) => {
            onChange(selected);
            navigator.pop();
        }}
        onCancel={() => navigator.pop()}
    />
);



const NPDSelectionPage = ({ schedule, value, onChange, navigator }: { schedule: string, value: number | undefined, onChange: (v: number) => void, navigator: Navigator }) => {
    const entries = getScheduleEntries(schedule as any) || [];
    if (entries.length === 0) {
        return (
            <Box sx={{ pt: 4 }}>
                <IOSListGroup>
                    <IOSListItem label="No schedule entries available" />
                </IOSListGroup>
            </Box>
        );
    }

    return (
        <IOSPickerPage
            items={entries.map((entry) => ({
                label: entry.nps.toString(),
                value: entry.nps,
            }))}
            selectedValue={value}
            onSelect={(selected) => {
                onChange(selected);
                navigator.pop();
            }}
            onCancel={() => navigator.pop()}
        />
    );
};

export const DiameterPage = ({ pipe, onUpdatePipe, navigator }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void, navigator: Navigator }) => {

    const openInputModePage = () => {
        navigator.push("Pipe Diameter Mode", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return (
                <DiameterInputModePage
                    value={currentPipe.diameterInputMode ?? "nps"}
                    onChange={(v) => onUpdatePipe(pipe.id, { diameterInputMode: v })}
                    navigator={nav}
                />
            );
        });
    };

    const openSchedulePage = () => {
        navigator.push("Schedule", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return (
                <SchedulePage
                    value={currentPipe.pipeSchedule ?? "40"}
                    onChange={(v) => {
                        const newDiameter = nearest_pipe_diameter(currentPipe.pipeNPD, v);
                        onUpdatePipe(pipe.id, {
                            pipeSchedule: v,
                            ...(newDiameter !== undefined ? { diameter: newDiameter, diameterUnit: "mm" } : {}),
                            diameterUpdateStatus: 'manual' as UpdateStatus
                        });
                    }}
                    navigator={nav}
                />
            );
        });
    };

    const openNPDPage = () => {
        navigator.push("NPD", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return (
                <NPDSelectionPage
                    schedule={currentPipe.pipeSchedule ?? "40"}
                    value={currentPipe.pipeNPD}
                    onChange={(v) => {
                        const newDiameter = nearest_pipe_diameter(v, currentPipe.pipeSchedule ?? "40");
                        onUpdatePipe(pipe.id, {
                            pipeNPD: v,
                            ...(newDiameter !== undefined ? { diameter: newDiameter, diameterUnit: "mm" } : {}),
                            diameterUpdateStatus: 'manual' as UpdateStatus
                        });
                    }}
                    navigator={nav}
                />
            );
        });
    };

    const openDiameterQuantityPage = (
        label: string,
        field: "diameter" | "outletDiameter" | "inletDiameter",
        unitField: "diameterUnit" | "outletDiameterUnit" | "inletDiameterUnit"
    ) => {
        navigator.push(label, (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return (
                <IOSQuantityPage
                    label={label}
                    value={currentPipe[field] ?? ""}
                    unit={currentPipe[unitField] ?? "mm"}
                    units={["mm", "cm", "m", "in", "ft"]}
                    unitFamily="length"
                    onValueChange={(v) => onUpdatePipe(pipe.id, { [field]: v, diameterUpdateStatus: 'manual' as UpdateStatus })}
                    onUnitChange={(u) => onUpdatePipe(pipe.id, { [unitField]: u })}
                    validate={(v) => validatePositive(v, label)}
                    autoFocus
                    onBack={() => navigator.pop()}
                />
            );
        });
    };

    return (
        <Box sx={{ pt: 2 }}>
            {(!pipe.diameter && !pipe.pipeNPD) && (
                <Box sx={{ px: 2, pb: 2 }}>
                    <Typography sx={{ color: "error.main", fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ErrorOutline /> Diameter is missing
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                        Please select a Nominal Pipe Size (NPS) or enter a custom diameter.
                    </Typography>
                </Box>
            )}
            <IOSListGroup>
                <IOSListItem
                    label="Pipe Diameter Mode"
                    value={pipe.diameterInputMode === "diameter" ? "Diameter" : "NPS"}
                    onClick={openInputModePage}
                    chevron
                    last
                />
            </IOSListGroup>

            {pipe.diameterInputMode === "diameter" ? (
                <IOSListGroup>
                    <IOSListItem
                        label="Pipe Diameter"
                        value={`${typeof pipe.diameter === 'number' ? pipe.diameter.toFixed(3) : "-"} ${pipe.diameterUnit ?? "mm"}`}
                        onClick={() => openDiameterQuantityPage("Pipe Diameter", "diameter", "diameterUnit")}
                        chevron
                    />

                    <IOSListItem
                        label="Inlet Diameter"
                        value={`${typeof pipe.inletDiameter === 'number' ? pipe.inletDiameter.toFixed(3) : "-"} ${pipe.inletDiameterUnit ?? "mm"}`}
                        onClick={() => openDiameterQuantityPage("Inlet Diameter", "inletDiameter", "inletDiameterUnit")}
                        chevron
                    />
                    <IOSListItem
                        label="Outlet Diameter"
                        value={`${typeof pipe.outletDiameter === 'number' ? pipe.outletDiameter.toFixed(3) : "-"} ${pipe.outletDiameterUnit ?? "mm"}`}
                        onClick={() => openDiameterQuantityPage("Outlet Diameter", "outletDiameter", "outletDiameterUnit")}
                        chevron
                        last
                    />
                </IOSListGroup>
            ) : (
                <>
                    <IOSListGroup>
                        <IOSListItem
                            label="NPD"
                            value={pipe.pipeNPD?.toString() ?? "-"}
                            onClick={openNPDPage}
                            chevron
                        />
                        <IOSListItem
                            label="Schedule"
                            value={pipe.pipeSchedule ?? "-"}
                            onClick={openSchedulePage}
                            chevron
                            last
                        />
                    </IOSListGroup>
                    <Typography variant="caption" sx={{ px: 2, pt: 1, pb: 2, display: "block", color: "text.secondary" }}>
                        Pipe Diameter: {typeof pipe.diameter === 'number' ? pipe.diameter.toFixed(3) : "-"} {pipe.diameterUnit ?? "mm"}
                    </Typography>

                    <IOSListGroup>
                        <IOSListItem
                            label="Inlet Diameter"
                            value={`${typeof pipe.inletDiameter === 'number' ? pipe.inletDiameter.toFixed(3) : "-"} ${pipe.inletDiameterUnit ?? "mm"}`}
                            onClick={() => openDiameterQuantityPage("Inlet Diameter", "inletDiameter", "inletDiameterUnit")}
                            chevron
                        />

                        <IOSListItem
                            label="Outlet Diameter"
                            value={`${typeof pipe.outletDiameter === 'number' ? pipe.outletDiameter.toFixed(3) : "-"} ${pipe.outletDiameterUnit ?? "mm"}`}
                            onClick={() => openDiameterQuantityPage("Outlet Diameter", "outletDiameter", "outletDiameterUnit")}
                            chevron
                            last
                        />
                    </IOSListGroup>
                </>
            )}
        </Box>
    );
};

// --- Calculation Type ---

export const CalculationTypePage = ({ pipe, onUpdatePipe, navigator }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void, navigator?: Navigator }) => (
    <IOSPickerPage
        items={[
            { label: "Pipeline", value: "pipeline" },
            { label: "Control Valve", value: "control valve" },
            { label: "Orifice", value: "orifice" },
        ]}
        selectedValue={pipe.pipeSectionType ?? "pipeline"}
        onSelect={(selected) => {
            onUpdatePipe(pipe.id, { pipeSectionType: selected as PipeProps["pipeSectionType"] });
            navigator?.pop();
        }}
        onCancel={() => navigator?.pop()}
    />
);

// --- Length & Elevation ---

export const RoughnessPage = ({ pipe, onUpdatePipe, navigator }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void, navigator: Navigator }) => (
    <IOSQuantityPage
        label="Roughness"
        value={pipe.roughness ?? ""}
        unit={pipe.roughnessUnit ?? "mm"}
        units={QUANTITY_UNIT_OPTIONS.lengthSmall}
        unitFamily="lengthSmall"
        onValueChange={(v) => onUpdatePipe(pipe.id, { roughness: v })}
        onUnitChange={(u) => onUpdatePipe(pipe.id, { roughnessUnit: u })}
        validate={(v) => validateNonNegative(v, "Roughness")}
        autoFocus
        onBack={() => navigator.pop()}
    />
);

export const LengthPage = ({ pipe, onUpdatePipe, startNode, endNode, navigator }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void, startNode?: NodeProps, endNode?: NodeProps, navigator: Navigator }) => {
    const handleEstimate = async () => {
        if (!startNode || !endNode || !pipe.diameter || !pipe.massFlowRate) return;

        const p1 = startNode.pressure;
        const p2 = endNode.pressure;
        if (typeof p1 !== 'number' || typeof p2 !== 'number') return;

        const p1Pa = convertUnit(p1, startNode.pressureUnit || "Pa", "Pa");
        const p2Pa = convertUnit(p2, endNode.pressureUnit || "Pa", "Pa");

        // Calculate target pressure drop (must be positive for flow)
        // We assume flow is from higher to lower pressure for estimation
        const targetDeltaP = Math.abs(p1Pa - p2Pa);

        if (targetDeltaP <= 0) return;

        // Use Python API for robust estimation (Gas & Liquid)
        try {
            // Helper to get fluid properties
            const fluid = pipe.fluid || startNode.fluid;
            if (!fluid) return;

            // Prepare API Request
            const request: LengthEstimationRequest = {
                id: pipe.id,
                name: pipe.name || "Pipe",
                targetPressureDrop: targetDeltaP,
                pipeDiameter: pipe.diameter,
                pipeDiameterUnit: pipe.diameterUnit || "mm",
                massFlowRate: pipe.massFlowRate,
                massFlowRateUnit: pipe.massFlowRateUnit || "kg/h",
                roughness: pipe.roughness || 0.0457,
                roughnessUnit: pipe.roughnessUnit || "mm",
                elevation: pipe.elevation || 0,
                elevationUnit: pipe.elevationUnit || "m",
                boundaryPressure: p1Pa, // Boundary Pressure (Upstream)
                boundaryPressureUnit: "Pa",
                boundaryTemperature: startNode.temperature || 298.15,
                boundaryTemperatureUnit: startNode.temperatureUnit || "K",
                fluid: {
                    phase: fluid.phase || "liquid",
                    density: fluid.density,
                    viscosity: fluid.viscosity,
                    viscosityUnit: fluid.viscosityUnit,
                    molecularWeight: fluid.molecularWeight,
                    zFactor: fluid.zFactor,
                    specificHeatRatio: fluid.specificHeatRatio
                },
                direction: pipe.direction || "forward",
                gasFlowModel: pipe.gasFlowModel || "isothermal",
                lengthMin: 0.1,
                lengthMax: 100000,
                tolerance: 10 // 10 Pa tolerance
            };

            const result = await solveLengthFromPressureDropAPI(request);

            if (result.success && result.estimatedLength) {
                onUpdatePipe(pipe.id, { length: result.estimatedLength, lengthUnit: "m", lengthUpdateStatus: 'auto' as UpdateStatus });
            } else {
                console.warn("Length estimation failed:", result.error);
            }

        } catch (e) {
            console.error("Failed to estimate length:", e);
        }
    };

    return (
        <IOSQuantityPage
            label="Length"
            value={pipe.length ?? ""}
            unit={pipe.lengthUnit ?? "m"}
            units={QUANTITY_UNIT_OPTIONS.length}
            unitFamily="length"
            onValueChange={(v) => onUpdatePipe(pipe.id, { length: v, lengthUpdateStatus: 'manual' as UpdateStatus })}
            onUnitChange={(u) => onUpdatePipe(pipe.id, { lengthUnit: u })}
            validate={(v) => validateNonNegative(v, "Length")}
            autoFocus
            action={
                <IOSListGroup>
                    <IOSListItem
                        label="Estimate from Pressure Drop"
                        onClick={handleEstimate}
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
                                <AutoFixHigh sx={{ fontSize: 18 }} />
                            </Box>
                        }
                        textColor="primary.main"
                        last
                    />
                </IOSListGroup>
            }
            onBack={() => navigator.pop()}
        />
    );
};

export const ElevationPage = ({ pipe, onUpdatePipe, navigator }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void, navigator: Navigator }) => (
    <IOSQuantityPage
        label="Elevation Change"
        value={pipe.elevation ?? ""}
        unit={pipe.elevationUnit ?? "m"}
        units={QUANTITY_UNIT_OPTIONS.length}
        unitFamily="length"
        onValueChange={(v) => onUpdatePipe(pipe.id, { elevation: v })}
        onUnitChange={(u) => onUpdatePipe(pipe.id, { elevationUnit: u })}
        autoFocus
        onBack={() => navigator.pop()}
    />
);

// --- Control Valve & Orifice ---

const ControlValveInputModePage = ({ value, onChange, navigator }: { value: "cv" | "pressure_drop", onChange: (v: "cv" | "pressure_drop") => void, navigator: Navigator }) => (
    <IOSPickerPage
        items={[
            { label: "CV / Cg", value: "cv" },
            { label: "Pressure Drop", value: "pressure_drop" },
        ]}
        selectedValue={value}
        onSelect={(selected) => {
            onChange(selected);
            navigator.pop();
        }}
        onCancel={() => navigator.pop()}
    />
);

const OrificeInputModePage = ({ value, onChange, navigator }: { value: "beta_ratio" | "pressure_drop", onChange: (v: "beta_ratio" | "pressure_drop") => void, navigator: Navigator }) => (
    <IOSPickerPage
        items={[
            { label: "Beta Ratio", value: "beta_ratio" },
            { label: "Pressure Drop", value: "pressure_drop" },
        ]}
        selectedValue={value}
        onSelect={(selected) => {
            onChange(selected);
            navigator.pop();
        }}
        onCancel={() => navigator.pop()}
    />
);

export const ControlValvePage = ({ pipe, onUpdatePipe, navigator, viewSettings, startNode, endNode }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void, navigator: Navigator, viewSettings: ViewSettings, startNode?: NodeProps, endNode?: NodeProps }) => {
    const cvData = pipe.controlValve || { id: "cv", inputMode: "pressure_drop" };
    const isGas = pipe.fluid?.phase === "gas";
    const inputMode = cvData.inputMode || "pressure_drop";

    const openInputModePage = () => {
        navigator.push("Input Mode", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentCV = currentPipe.controlValve || { id: "cv", inputMode: "pressure_drop" };
            return (
                <ControlValveInputModePage
                    value={currentCV.inputMode || "pressure_drop"}
                    onChange={(v) => onUpdatePipe(pipe.id, { controlValve: { ...currentCV, inputMode: v } })}
                    navigator={nav}
                />
            );
        });
    };

    const openCVPage = () => {
        navigator.push("CV Value", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentCV = currentPipe.controlValve || { id: "cv", inputMode: "pressure_drop" };
            return (
                <IOSQuantityPage
                    label="CV Value"
                    value={currentCV.cv ?? ""}
                    placeholder="CV Value"
                    min={0}
                    autoFocus
                    onValueChange={(v) => onUpdatePipe(pipe.id, { controlValve: { ...currentCV, cv: v, cg: undefined } })}
                    onBack={() => nav.pop()}
                />
            );
        });
    };

    const openCgPage = () => {
        navigator.push("Cg Value", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentCV = currentPipe.controlValve || { id: "cv", inputMode: "pressure_drop" };
            return (
                <IOSQuantityPage
                    label="Cg Value"
                    value={currentCV.cg ?? ""}
                    placeholder="Cg Value"
                    min={0}
                    autoFocus
                    onValueChange={(v) => onUpdatePipe(pipe.id, { controlValve: { ...currentCV, cg: v, cv: undefined } })}
                    onBack={() => nav.pop()}
                />
            );
        });
    };

    const openPressureDropPage = () => {
        navigator.push("Pressure Drop", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentCV = currentPipe.controlValve || { id: "cv", inputMode: "pressure_drop" };

            const handleDefineFromNodes = () => {
                if (!startNode || !endNode) return;
                const p1 = startNode.pressure;
                const p2 = endNode.pressure;
                if (typeof p1 !== 'number' || typeof p2 !== 'number') return;

                const p1Pa = convertUnit(p1, startNode.pressureUnit || "Pa", "Pa");
                const p2Pa = convertUnit(p2, endNode.pressureUnit || "Pa", "Pa");
                const deltaP_Pa = Math.abs(p1Pa - p2Pa);

                const targetUnit = currentCV.pressureDropUnit || "kPa";
                const deltaP_Target = convertUnit(deltaP_Pa, "Pa", targetUnit);

                onUpdatePipe(pipe.id, { controlValve: { ...currentCV, pressureDrop: deltaP_Target } });
            };

            return (
                <IOSQuantityPage
                    label="Pressure Drop"
                    value={currentCV.pressureDrop ?? ""}
                    unit={currentCV.pressureDropUnit ?? "kPa"}
                    units={["Pa", "kPa", "bar", "psi"]}
                    unitFamily="pressure"
                    onValueChange={(v) => onUpdatePipe(pipe.id, { controlValve: { ...currentCV, pressureDrop: v } })}
                    onUnitChange={(u) => onUpdatePipe(pipe.id, { controlValve: { ...currentCV, pressureDropUnit: u } })}
                    min={0}
                    autoFocus
                    action={
                        <IOSListGroup>
                            <IOSListItem
                                label="Define from nodes"
                                onClick={handleDefineFromNodes}
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
                                        <AutoFixHigh sx={{ fontSize: 18 }} />
                                    </Box>
                                }
                                textColor="primary.main"
                                last
                            />
                        </IOSListGroup>
                    }
                    onBack={() => navigator.pop()}
                />
            );
        });
    };

    // Helper to format pressure drop
    const getFormattedPressureDrop = () => {
        const dp = pipe.pressureDropCalculationResults?.controlValvePressureDrop;
        if (dp === undefined) return "-";

        // Default to kPa if no unit system preferred, or use logic similar to formatPressure
        let unit = "kPa";
        if (viewSettings.unitSystem === "imperial") unit = "psi";
        else if (viewSettings.unitSystem === "metric_kgcm2") unit = "kg/cm2";
        else if (viewSettings.unitSystem === "fieldSI") unit = "bar";

        const val = convertUnit(dp, "Pa", unit);
        return `${val.toFixed(2)} ${unit}`;
    };

    return (
        <>
            <IOSListItem
                label="Input Mode"
                value={inputMode === "cv" ? (isGas ? "Cg" : "CV") : "Pressure Drop"}
                valueColor={USER_INPUT_COLOR}
                onClick={openInputModePage}
                chevron
            />
            {inputMode === "cv" ? (
                isGas ? (
                    <IOSListItem
                        label="Cg"
                        value={cvData.cg?.toFixed(4) ?? "-"}
                        valueColor={USER_INPUT_COLOR}
                        onClick={openCgPage}
                        chevron
                    />
                ) : (
                    <IOSListItem
                        label="CV"
                        value={cvData.cv?.toFixed(4) ?? "-"}
                        valueColor={USER_INPUT_COLOR}
                        onClick={openCVPage}
                        chevron
                    />
                )
            ) : (
                <IOSListItem
                    label="Pressure Drop"
                    value={`${cvData.pressureDrop?.toFixed(3) ?? "-"} ${cvData.pressureDropUnit ?? "kPa"}`}
                    valueColor={USER_INPUT_COLOR}
                    onClick={openPressureDropPage}
                    chevron
                />
            )}
            {inputMode === "cv" ? (
                <IOSListItem
                    label="Calculated dP"
                    value={getFormattedPressureDrop()}
                    last
                />
            ) : (
                isGas ? (
                    <IOSListItem
                        label="Calculated Cg"
                        value={pipe.pressureDropCalculationResults?.controlValveCg?.toFixed(3) ?? "-"}
                        last
                    />
                ) : (
                    <IOSListItem
                        label="Calculated CV"
                        value={pipe.pressureDropCalculationResults?.controlValveCV?.toFixed(3) ?? "-"}
                        last
                    />
                )
            )}
        </>
    );
};

export const OrificePage = ({ pipe, onUpdatePipe, navigator, viewSettings, startNode, endNode }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void, navigator: Navigator, viewSettings: ViewSettings, startNode?: NodeProps, endNode?: NodeProps }) => {
    const orificeData = pipe.orifice || { id: "orifice", inputMode: "beta_ratio" };
    const inputMode = orificeData.inputMode || "beta_ratio";

    const openInputModePage = () => {
        navigator.push("Input Mode", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentOrifice = currentPipe.orifice || { id: "orifice", inputMode: "beta_ratio" };
            return (
                <OrificeInputModePage
                    value={currentOrifice.inputMode || "beta_ratio"}
                    onChange={(v) => onUpdatePipe(pipe.id, { orifice: { ...currentOrifice, inputMode: v } })}
                    navigator={nav}
                />
            );
        });
    };

    const openBetaRatioPage = () => {
        navigator.push("Beta Ratio", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentOrifice = currentPipe.orifice || { id: "orifice", inputMode: "beta_ratio" };
            return (
                <IOSQuantityPage
                    label="Beta Ratio"
                    value={currentOrifice.betaRatio ?? ""}
                    placeholder="Beta Ratio (d/D)"
                    validate={(v) => validateBetaRatio(v)}
                    autoFocus
                    onValueChange={(v) => onUpdatePipe(pipe.id, { orifice: { ...currentOrifice, betaRatio: v } })}
                    onBack={() => nav.pop()}
                />
            );
        });
    };

    const openPressureDropPage = () => {
        navigator.push("Pressure Drop", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentOrifice = currentPipe.orifice || { id: "orifice", inputMode: "beta_ratio" };

            const handleDefineFromNodes = () => {
                if (!startNode || !endNode) return;
                const p1 = startNode.pressure;
                const p2 = endNode.pressure;
                if (typeof p1 !== 'number' || typeof p2 !== 'number') return;

                const p1Pa = convertUnit(p1, startNode.pressureUnit || "Pa", "Pa");
                const p2Pa = convertUnit(p2, endNode.pressureUnit || "Pa", "Pa");
                const deltaP_Pa = Math.abs(p1Pa - p2Pa);

                const targetUnit = currentOrifice.pressureDropUnit || "kPa";
                const deltaP_Target = convertUnit(deltaP_Pa, "Pa", targetUnit);

                onUpdatePipe(pipe.id, { orifice: { ...currentOrifice, pressureDrop: deltaP_Target } });
            };

            return (
                <IOSQuantityPage
                    label="Pressure Drop"
                    value={currentOrifice.pressureDrop ?? ""}
                    unit={currentOrifice.pressureDropUnit ?? "kPa"}
                    units={["Pa", "kPa", "bar", "psi"]}
                    unitFamily="pressure"
                    onValueChange={(v) => onUpdatePipe(pipe.id, { orifice: { ...currentOrifice, pressureDrop: v } })}
                    onUnitChange={(u) => onUpdatePipe(pipe.id, { orifice: { ...currentOrifice, pressureDropUnit: u } })}
                    min={0}
                    autoFocus
                    action={
                        <IOSListGroup>
                            <IOSListItem
                                label="Define from nodes"
                                onClick={handleDefineFromNodes}
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
                                        <AutoFixHigh sx={{ fontSize: 18 }} />
                                    </Box>
                                }
                                textColor="primary.main"
                                last
                            />
                        </IOSListGroup>
                    }
                    onBack={() => navigator.pop()}
                />
            );
        });
    };

    // Helper to format pressure drop
    const getFormattedPressureDrop = () => {
        const dp = pipe.pressureDropCalculationResults?.orificePressureDrop;
        if (dp === undefined) return "-";

        // Default to kPa if no unit system preferred, or use logic similar to formatPressure
        let unit = "kPa";
        if (viewSettings.unitSystem === "imperial") unit = "psi";
        else if (viewSettings.unitSystem === "metric_kgcm2") unit = "kg/cm2";

        const val = convertUnit(dp, "Pa", unit);
        return `${val.toFixed(2)} ${unit}`;
    };

    return (
        <>
            <IOSListItem
                label="Input Mode"
                value={inputMode === "beta_ratio" ? "Beta Ratio" : "Pressure Drop"}
                valueColor={USER_INPUT_COLOR}
                onClick={openInputModePage}
                chevron
            />
            {inputMode === "beta_ratio" ? (
                <IOSListItem
                    label="Beta Ratio"
                    value={orificeData.betaRatio?.toFixed(4) ?? "-"}
                    valueColor={USER_INPUT_COLOR}
                    onClick={openBetaRatioPage}
                    chevron
                />
            ) : (
                <IOSListItem
                    label="Pressure Drop"
                    value={`${orificeData.pressureDrop?.toFixed(3) ?? "-"} ${orificeData.pressureDropUnit ?? "kPa"}`}
                    valueColor={USER_INPUT_COLOR}
                    onClick={openPressureDropPage}
                    chevron
                />
            )}
            {inputMode === "beta_ratio" ? (
                <IOSListItem
                    label="Calculated dP"
                    value={getFormattedPressureDrop()}
                    last
                />
            ) : (
                <IOSListItem
                    label="Calculated Beta Ratio"
                    value={pipe.pressureDropCalculationResults?.orificeBetaRatio?.toFixed(4) ?? "-"}
                    last
                />
            )}
        </>
    );
};

export const UserSpecifiedPressureLossPage = ({ pipe, onUpdatePipe, navigator }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void, navigator: Navigator }) => (
    <IOSQuantityPage
        label="User Specified Drop"
        value={pipe.userSpecifiedPressureLoss ?? ""}
        unit={pipe.userSpecifiedPressureLossUnit ?? "Pa"}
        units={["Pa", "kPa", "bar", "psi"]}
        unitFamily="pressure"
        onValueChange={(v) => onUpdatePipe(pipe.id, { userSpecifiedPressureLoss: v })}
        onUnitChange={(u) => onUpdatePipe(pipe.id, { userSpecifiedPressureLossUnit: u })}
        min={0}
        autoFocus
        onBack={() => navigator.pop()}
    />
);

// --- Direction ---

export const DirectionPage = ({ pipe, onUpdatePipe, navigator }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void, navigator?: Navigator }) => (
    <IOSPickerPage
        items={[
            { label: "Forward", value: "forward" },
            { label: "Backward", value: "backward" },
        ]}
        selectedValue={pipe.direction ?? "forward"}
        onSelect={(selected) => {
            onUpdatePipe(pipe.id, { direction: selected as PipeProps["direction"] });
            navigator?.pop();
        }}
        onCancel={() => navigator?.pop()}
    />
);

// --- Pipe Fittings ---

export const PipeFittingsPage = ({ pipe, onUpdatePipe, navigator }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void, navigator: Navigator }) => {
    const fittings = pipe.fittings || [];

    const updateFitting = (type: string, count: number) => {
        const existingIndex = fittings.findIndex(f => f.type === type);
        let newFittings = [...fittings];

        if (existingIndex >= 0) {
            if (count > 0) {
                newFittings[existingIndex] = { ...newFittings[existingIndex], count };
            } else {
                newFittings.splice(existingIndex, 1);
            }
        } else if (count > 0) {
            newFittings.push({ type, count, k_each: 0, k_total: 0 }); // k_each/total will be calculated elsewhere
        }

        onUpdatePipe(pipe.id, { fittings: newFittings });
    };

    const getCount = (type: string) => fittings.find(f => f.type === type)?.count || 0;

    const openSafetyFactorPage = () => {
        navigator.push("Fitting Safety Factor", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return (
                <IOSQuantityPage
                    label="Fitting Safety Factor (%)"
                    value={currentPipe.pipingFittingSafetyFactor ?? ""}
                    unit="%"
                    units={["%"]}
                    unitFamily="dimensionless"
                    onValueChange={(v) => onUpdatePipe(pipe.id, { pipingFittingSafetyFactor: v })}
                    onUnitChange={() => { }}
                    min={0}
                    autoFocus
                    onBack={() => navigator.pop()}
                />
            );
        });
    };

    const openUserKPage = () => {
        navigator.push("User K Value", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return (
                <IOSQuantityPage
                    label="User K Value"
                    value={currentPipe.userK ?? ""}
                    placeholder="User K Value"
                    min={0}
                    autoFocus
                    onValueChange={(v) => onUpdatePipe(pipe.id, { userK: v })}
                    onBack={() => nav.pop()}
                />
            );
        });
    };

    return (
        <Box sx={{ pt: 2 }}>
            <IOSListGroup>
                <IOSListItem
                    label="Fitting Safety Factor"
                    value={`${pipe.pipingFittingSafetyFactor ?? 0}%`}
                    onClick={openSafetyFactorPage}
                    chevron
                />
                <IOSListItem
                    label="User K Value"
                    value={pipe.userK?.toString() ?? "0.0"}
                    onClick={openUserKPage}
                    chevron
                    last
                />
            </IOSListGroup>

            <IOSListGroup>
                {(() => {
                    const lastVisibleIndex = PIPE_FITTING_OPTIONS.reduce((lastIndex, option, index) => {
                        const count = getCount(option.value);
                        const isSwage = option.value === "inlet_swage" || option.value === "outlet_swage";
                        if (isSwage && count === 0) {
                            return lastIndex;
                        }
                        return index;
                    }, -1);

                    return PIPE_FITTING_OPTIONS.map((option, index) => {
                        const count = getCount(option.value);
                        const isToggle = option.value === "pipe_entrance_normal" || option.value === "pipe_entrance_raise" || option.value === "pipe_exit";
                        const isSwage = option.value === "inlet_swage" || option.value === "outlet_swage";

                        if (isSwage && count === 0) {
                            return null;
                        }

                        return (
                            <IOSListItem
                                key={option.value}
                                label={option.label}
                                control={isToggle ? (
                                    <Switch
                                        size="small"
                                        checked={count > 0}
                                        onChange={(e) => updateFitting(option.value, e.target.checked ? 1 : 0)}
                                    />
                                ) : undefined}
                                value={isSwage ? (() => {
                                    const pipeDia = pipe.diameter || 0;
                                    if (option.value === "inlet_swage") {
                                        const inletDia = pipe.inletDiameter || pipeDia;
                                        return inletDia < pipeDia ? "Expand" : "Reduce";
                                    } else {
                                        const outletDia = pipe.outletDiameter || pipeDia;
                                        return outletDia < pipeDia ? "Reduce" : "Expand";
                                    }
                                })() : (!isToggle ? (
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateFitting(option.value, Math.max(0, count - 1));
                                            }}
                                            sx={{
                                                width: "28px",
                                                height: "28px",
                                                color: (theme) => theme.palette.mode === 'dark' ? "#ffffff" : "#000000",
                                                backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                                                "&:hover": {
                                                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                                                }
                                            }}
                                        >
                                            <Remove sx={{ fontSize: "16px" }} />
                                        </IconButton>
                                        <Typography sx={{ minWidth: "24px", textAlign: "center", fontSize: "14px" }}>
                                            {count}
                                        </Typography>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateFitting(option.value, count + 1);
                                            }}
                                            sx={{
                                                width: "28px",
                                                height: "28px",
                                                color: (theme) => theme.palette.mode === 'dark' ? "#ffffff" : "#000000",
                                                backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                                                "&:hover": {
                                                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                                                }
                                            }}
                                        >
                                            <Add sx={{ fontSize: "16px" }} />
                                        </IconButton>
                                    </Stack>
                                ) : undefined)}
                                onClick={(!isToggle && !isSwage) ? undefined : undefined}
                                chevron={!isToggle && !isSwage ? false : (!isToggle && !isSwage)}
                                last={index === lastVisibleIndex}
                            />
                        );
                    });
                })()}
            </IOSListGroup>
        </Box>
    );
};

// --- Summary ---

export function PipeSummaryPage({ pipe, viewSettings, navigator }: { pipe: PipeProps, viewSettings: ViewSettings, navigator: Navigator }) {
    const results = pipe.pressureDropCalculationResults;
    const velocity = pipe.resultSummary?.outletState?.velocity;
    const [openVelocityCriteria, setOpenVelocityCriteria] = useState(false);

    const formatPressure = (value: number | undefined) => {
        if (value === undefined) return "-";

        const unitSystem = viewSettings.unitSystem;
        let unit = "kPa";
        let targetUnit = "kPa";

        switch (unitSystem) {
            case "imperial":
                unit = "psi";
                targetUnit = "psi";
                break;
            case "fieldSI":
                unit = "bar";
                targetUnit = "bar";
                break;
            case "metric_kgcm2":
                unit = "kg/cm²";
                targetUnit = "kg/cm2";
                break;
            case "metric":
            default:
                unit = "kPa";
                targetUnit = "kPa";
                break;
        }

        // Input value is always in Pascals (Pa)
        const convertedValue = convertUnit(value, "Pa", targetUnit);
        return `${convertedValue.toFixed(2)} ${unit}`;
    };

    const formatVelocity = (value: number | undefined | null) => {
        if (value === undefined || value === null) return "-";

        const unitSystem = viewSettings.unitSystem;
        let unit = "m/s";
        let convertedValue = value;

        if (unitSystem === "imperial") {
            unit = "ft/s";
            convertedValue = convertUnit(value, "m/s", "ft/s");
        }

        return `${convertedValue.toFixed(2)} ${unit}`;
    };

    const formatUserSpecifiedDrop = () => {
        // For control valve and orifice sections, user drop is shown in separate fields
        // so "User Specified Drop" should be 0.00 (not applicable to these components)
        if (pipe.pipeSectionType === "control valve" || pipe.pipeSectionType === "orifice") {
            return "-";
        }
        // For pipeline sections, show userSpecifiedPressureDrop from calculation results
        if (results?.userSpecifiedPressureDrop) {
            return formatPressure(results.userSpecifiedPressureDrop);
        }
        return "-";
    };

    return (
        <Box sx={{ pt: 2 }}>
            <IOSListGroup>
                <IOSListItem label="Pipe K" value={results?.pipeLengthK?.toFixed(3) ?? "-"} />
                <IOSListItem label="Fittings K" value={results?.fittingK?.toFixed(3) ?? "-"} />
                <IOSListItem label="Sub-Total K" value={(() => {
                    const pipeK = results?.pipeLengthK ?? 0;
                    const fittingK = results?.fittingK ?? 0;
                    const subTotal = pipeK + fittingK;
                    return subTotal > 0 ? subTotal.toFixed(3) : "-";
                })()} />
                <IOSListItem
                    label="Total K"
                    value={results?.totalK?.toFixed(3) ?? "-"}
                    last
                />
            </IOSListGroup>

            <IOSListGroup>
                <IOSListItem label="Reynolds Number" value={results?.reynoldsNumber?.toFixed(0) ?? "-"} />
                <IOSListItem label="Flow Scheme" value={results?.flowScheme ?? "-"} />
                <IOSListItem label="Friction Factor" value={results?.frictionalFactor?.toFixed(4) ?? "-"} />
                <IOSListItem label="Velocity" value={formatVelocity(velocity) ?? "-"} last />
            </IOSListGroup>
            <Box sx={{ pl: 3, pb: 2, mt: -2 }}>
                <Typography
                    variant="body2"
                    sx={{
                        color: "primary.main",
                        cursor: "pointer",
                        textDecoration: "none",
                        "&:hover": { textDecoration: "underline" }
                    }}
                    onClick={() => setOpenVelocityCriteria(true)}
                >
                    Velocity criteria...
                </Typography>
            </Box>

            <IOSListGroup>
                <IOSListItem label="Pipe & Fitting" value={formatPressure(results?.pipeAndFittingPressureDrop) ?? "-"} />
                <IOSListItem label="Elevation Change" value={formatPressure(results?.elevationPressureDrop) ?? "-"} />
                <IOSListItem label="Control Valve drop" value={formatPressure(results?.controlValvePressureDrop) ?? "-"} />
                <IOSListItem label="Orifice drop" value={formatPressure(results?.orificePressureDrop) ?? "-"} />
                <IOSListItem
                    label="User Specified Drop"
                    value={formatUserSpecifiedDrop()}
                />
                <IOSListItem label="Total Pressure Drop" value={formatPressure(results?.totalSegmentPressureDrop) ?? "-"} last />
            </IOSListGroup>

            <Dialog
                open={openVelocityCriteria}
                onClose={() => setOpenVelocityCriteria(false)}
                maxWidth="lg"
                fullWidth
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: "16px",
                            backgroundColor: (theme) => theme.palette.mode === 'dark' ? "#1c1c1e" : "#f2f2f7",
                        }
                    }
                }}
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 600, flex: 1, textAlign: 'center' }}>
                        Velocity Criteria
                    </Typography>
                    <IconButton
                        aria-label="close"
                        onClick={() => setOpenVelocityCriteria(false)}
                        sx={{
                            position: 'absolute',
                            right: 16,
                            color: (theme) => theme.palette.grey[500],
                            backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                            '&:hover': {
                                backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                            },
                        }}
                        size="small"
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ borderTop: 'none', borderBottom: 'none' }}>
                    <VelocityCriteriaPage />
                </DialogContent>
            </Dialog>
        </Box>
    );
}

// --- Boundary Node ---

export const BoundaryNodePage = ({ node, onUpdateNode, navigator }: { node: NodeProps, onUpdateNode: (id: string, patch: NodePatch) => void, navigator: Navigator }) => {

    const openPressurePage = () => {
        navigator.push("Pressure", (net, nav) => {
            const currentNode = net.nodes.find(n => n.id === node.id);
            if (!currentNode) return null;
            return (
                <IOSQuantityPage
                    label="Pressure"
                    value={currentNode.pressure ?? ""}
                    unit={currentNode.pressureUnit ?? "kPag"}
                    units={QUANTITY_UNIT_OPTIONS.pressure}
                    unitFamily="pressure"
                    onChange={(v, u) => onUpdateNode(node.id, { pressure: v, pressureUnit: u })}
                    validate={(v, u) => validatePressure(v, u)}
                    autoFocus
                    onBack={() => nav.pop()}
                />
            );
        });
    };

    const openTemperaturePage = () => {
        navigator.push("Temperature", (net, nav) => {
            const currentNode = net.nodes.find(n => n.id === node.id);
            if (!currentNode) return null;
            return (
                <IOSQuantityPage
                    label="Temperature"
                    value={currentNode.temperature ?? ""}
                    unit={currentNode.temperatureUnit ?? "C"}
                    units={QUANTITY_UNIT_OPTIONS.temperature}
                    unitFamily="temperature"
                    onChange={(v, u) => onUpdateNode(node.id, { temperature: v, temperatureUnit: u })}
                    validate={validateTemperature}
                    autoFocus
                    onBack={() => nav.pop()}
                />
            );
        });
    };

    return (
        <Box sx={{ pt: 2 }}>
            <IOSListGroup header={node.label}>
                <IOSListItem
                    label="Pressure"
                    value={`${node.pressure?.toFixed(2) ?? "-"} ${node.pressureUnit ?? ""}`}
                    valueColor={getValueColor(node.pressureUpdateStatus)}
                    onClick={openPressurePage}
                    chevron
                />
                <IOSListItem
                    label="Temperature"
                    value={`${node.temperature?.toFixed(2) ?? "-"} ${node.temperatureUnit ?? ""}`}
                    valueColor={getValueColor(node.temperatureUpdateStatus)}
                    onClick={openTemperaturePage}
                    chevron
                    last
                />
            </IOSListGroup>
        </Box>
    );
};

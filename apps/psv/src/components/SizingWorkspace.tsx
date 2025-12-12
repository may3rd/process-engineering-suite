"use client";

import { useState, useEffect } from "react";
import {
    Box,
    Paper,
    Tabs,
    Tab,
    Typography,
    Button,
    IconButton,
    TextField,
    MenuItem,
    InputAdornment,
    Card,
    CardContent,
    Chip,
    Switch,
    FormControlLabel,
    Radio,
    RadioGroup,
    FormControl,
    FormLabel,
    Tooltip,
    LinearProgress,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Alert,
    useTheme,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from "@mui/material";
import {
    ArrowBack,
    Info,
    CheckCircle,
    Warning,
    Error as ErrorIcon,
    Download,
    Calculate,
    Delete,
    Settings,
    HelpOutline,
    Speed,
    Straighten,
    Timeline,
} from "@mui/icons-material";
import { SizingCase, PipelineNetwork, PipeProps, ORIFICE_SIZES, SizingInputs, UnitPreferences } from "@/data/types";
import { PipelineDataGrid } from "./PipelineDataGrid";
import { PipeEditorDialog } from "./PipeEditorDialog";
import { HydraulicReportTable } from "./HydraulicReportTable";
import { HydraulicReportDialog } from "./HydraulicReportDialog";
import { v4 as uuidv4 } from "uuid";
import { calculateSizing } from "@/lib/psvSizing";
import { useUnitConversion, UnitType } from "@/hooks/useUnitConversion";
import type { FluidProperties } from "@/lib/apiClient";
import {
    validateInletPressureDrop,
    calculateNetworkPressureDrop,
    calculateNetworkPressureDropWithWarnings,
    type NetworkPressureDropResult,
} from "@/lib/hydraulicValidation";
import {
    validateSizingInputs,
    getFieldLabel,
    type ValidationResult,
    type ValidationError
} from "@/lib/inputValidation";
import { useAuthStore } from "@/store/useAuthStore";

interface SizingWorkspaceProps {
    sizingCase: SizingCase;
    inletNetwork?: PipelineNetwork;
    outletNetwork?: PipelineNetwork;
    psvSetPressure?: number;
    onClose: () => void;
    onSave: (updatedCase: SizingCase, context?: { networkChanged?: boolean }) => void;
    onSaveNetworks?: (
        inlet: PipelineNetwork | undefined,
        outlet: PipelineNetwork | undefined,
        networkChanged?: boolean
    ) => void;
    psvTag?: string;
    onDelete?: () => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`sizing-tabpanel-${index}`}
            aria-labelledby={`sizing-tab-${index}`}
            {...other}
            style={{ height: '100%', overflow: 'auto' }}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

// Unit options for different fields
const PRESSURE_UNITS = ['barg', 'bara', 'kPag', 'kg_cm2g', 'psig', 'psia', 'kPa'];
const TEMPERATURE_UNITS = ['C', 'F', 'K'];  // No ° symbol for convertUnit compatibility
const FLOW_UNITS = ['kg/h', 'lb/h', 'kg/s'];
const VISCOSITY_UNITS = ['cP', 'Pa·s'];
const DENSITY_UNITS = ['kg/m³', 'lb/ft³'];

export function SizingWorkspace({ sizingCase, inletNetwork, outletNetwork, psvSetPressure, onClose, onSave, onSaveNetworks, psvTag, onDelete }: SizingWorkspaceProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const canEdit = useAuthStore((state) => state.canEdit());
    const [activeTab, setActiveTab] = useState(0);
    const [currentCase, setCurrentCase] = useState<SizingCase>(sizingCase);
    const [manualOrificeMode, setManualOrificeMode] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);

    // Button state tracking
    // Always start fresh - user must calculate in this session
    const [isDirty, setIsDirty] = useState(false);
    const [isCalculated, setIsCalculated] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

    // Multiple valve support
    const [numberOfValves, setNumberOfValves] = useState(sizingCase.outputs.numberOfValves || 1);

    // Hydraulic calculation flow source: 'relieving' = mass flow rate, 'rated' = rated capacity
    const [hydraulicFlowSource, setHydraulicFlowSource] = useState<'relieving' | 'rated'>('relieving');

    // Local network state (from PSV, not sizing case)
    const [localInletNetwork, setLocalInletNetwork] = useState<PipelineNetwork | undefined>(inletNetwork);
    const [localOutletNetwork, setLocalOutletNetwork] = useState<PipelineNetwork | undefined>(outletNetwork);
    const [networkDirty, setNetworkDirty] = useState(false);

    // Unit state
    // Unit Conversion Hook
    const defaultPreferences: UnitPreferences = {
        pressure: 'barg',
        temperature: 'C',  // No ° symbol for convertUnit compatibility
        flow: 'kg/h',
        length: 'm',
        area: 'mm²',
        density: 'kg/m³',
        viscosity: 'cP',
    };

    const { preferences, setUnit, toDisplay, toDisplayDelta, getDeltaUnit, toBase } = useUnitConversion(sizingCase.unitPreferences || defaultPreferences);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");

    // Pipe editor dialog state
    const [pipeEditorOpen, setPipeEditorOpen] = useState(false);
    const [editingPipe, setEditingPipe] = useState<PipeProps | null>(null);
    const [editingPipeType, setEditingPipeType] = useState<'inlet' | 'outlet'>('inlet');

    // Hydraulic calculation warnings (e.g., choked flow)
    const [hydraulicWarnings, setHydraulicWarnings] = useState<string[]>([]);
    const [inletHydraulicResult, setInletHydraulicResult] = useState<NetworkPressureDropResult | null>(null);
    const [outletHydraulicResult, setOutletHydraulicResult] = useState<NetworkPressureDropResult | null>(null);
    const [hydraulicReportDialogOpen, setHydraulicReportDialogOpen] = useState(false);

    // Auto-fill molecular weight for steam (H₂O = 18.01528 g/mol)
    useEffect(() => {
        if (currentCase.method === 'steam' && currentCase.inputs.molecularWeight !== 18.01528) {
            setCurrentCase({
                ...currentCase,
                inputs: {
                    ...currentCase.inputs,
                    molecularWeight: 18.01528,
                },
            });
            setIsDirty(true);
        }
    }, [currentCase.method]);

    // Recompute hydraulic results on mount if case is already calculated and has networks
    // This restores the hydraulic summary when re-opening an existing sizing case
    useEffect(() => {
        if (sizingCase.status === 'calculated') {
            // Recompute inlet hydraulics if network exists
            if (inletNetwork?.pipes?.length && sizingCase.inputs.massFlowRate && sizingCase.inputs.pressure) {
                const fluid: FluidProperties = {
                    phase: sizingCase.method === 'gas' ? 'gas' :
                        sizingCase.method === 'liquid' ? 'liquid' :
                            sizingCase.method === 'two_phase' ? 'two_phase' : 'gas',
                    temperature: sizingCase.inputs.temperature,
                    pressure: sizingCase.inputs.pressure,
                    molecularWeight: sizingCase.inputs.molecularWeight,
                    compressibilityZ: sizingCase.inputs.compressibilityZ,
                    specificHeatRatio: sizingCase.inputs.specificHeatRatio,
                    gasViscosity: sizingCase.inputs.gasViscosity || sizingCase.inputs.viscosity,
                    liquidDensity: sizingCase.inputs.liquidDensity || sizingCase.inputs.density,
                    liquidViscosity: sizingCase.inputs.liquidViscosity || sizingCase.inputs.viscosity,
                };

                const inletResult = calculateNetworkPressureDropWithWarnings(
                    inletNetwork,
                    sizingCase.inputs.massFlowRate,
                    fluid,
                    {
                        boundaryPressure: sizingCase.inputs.pressure,
                        boundaryPressureUnit: 'barg',
                        boundaryTemperature: sizingCase.inputs.temperature,
                        boundaryTemperatureUnit: 'C',
                        direction: 'forward',
                    }
                );
                setInletHydraulicResult(inletResult);
            }

            // Recompute outlet hydraulics if network exists
            if (outletNetwork?.pipes?.length && sizingCase.inputs.massFlowRate && sizingCase.inputs.temperature) {
                const fluid: FluidProperties = {
                    phase: sizingCase.method === 'gas' ? 'gas' :
                        sizingCase.method === 'liquid' ? 'liquid' :
                            sizingCase.method === 'two_phase' ? 'two_phase' : 'gas',
                    temperature: sizingCase.inputs.temperature,
                    pressure: sizingCase.inputs.pressure,
                    molecularWeight: sizingCase.inputs.molecularWeight,
                    compressibilityZ: sizingCase.inputs.compressibilityZ,
                    specificHeatRatio: sizingCase.inputs.specificHeatRatio,
                    gasViscosity: sizingCase.inputs.gasViscosity || sizingCase.inputs.viscosity,
                    liquidDensity: sizingCase.inputs.liquidDensity || sizingCase.inputs.density,
                    liquidViscosity: sizingCase.inputs.liquidViscosity || sizingCase.inputs.viscosity,
                };

                const outletResult = calculateNetworkPressureDropWithWarnings(
                    outletNetwork,
                    sizingCase.inputs.massFlowRate,
                    fluid,
                    {
                        boundaryPressure: sizingCase.inputs.destinationPressure || 0,
                        boundaryPressureUnit: 'barg',
                        boundaryTemperature: sizingCase.inputs.temperature,
                        boundaryTemperatureUnit: 'C',
                        direction: 'backward',
                    }
                );
                setOutletHydraulicResult(outletResult);
            }

            // Set isCalculated to true since we're loading a calculated case
            setIsCalculated(true);
        }
    }, []); // Run once on mount

    const handleConfirmDelete = () => {
        if (deleteConfirmationInput === "delete sizing case") {
            onDelete?.();
        }
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    // Handle input changes for SizingInputs (converts Display Value -> Base Value)
    const handleInputChange = (field: keyof SizingInputs, displayValue: number | string, unitType?: UnitType) => {
        // Handle strings (non-numeric fields)
        if (typeof displayValue === 'string' && !unitType) {
            setCurrentCase({
                ...currentCase,
                inputs: {
                    ...currentCase.inputs,
                    [field]: displayValue,
                },
            });
            setIsDirty(true);
            setIsCalculated(false);
            return;
        }

        // Handle numeric values
        const numValue = typeof displayValue === 'string' ? parseFloat(displayValue) : displayValue;
        const safeValue = isNaN(numValue) ? 0 : numValue;

        // Convert to base unit if type is provided
        const baseValue = unitType ? toBase(safeValue, unitType) : safeValue;

        setCurrentCase({
            ...currentCase,
            inputs: {
                ...currentCase.inputs,
                [field]: baseValue,
            },
        });
        // Mark as dirty and needs recalculation
        setIsDirty(true);
        setIsCalculated(false);
        setValidationResult(null); // Clear any previous validation errors
    };

    // Handle orifice selection
    const handleOrificeChange = (designation: string) => {
        const orifice = ORIFICE_SIZES.find(o => o.designation === designation);
        if (orifice) {
            const percentUsed = (currentCase.outputs.requiredArea / orifice.area) * 100;
            setCurrentCase({
                ...currentCase,
                outputs: {
                    ...currentCase.outputs,
                    selectedOrifice: designation,
                    orificeArea: orifice.area,
                    percentUsed: percentUsed,
                },
            });
        }
    };

    // Auto-select smallest suitable orifice (considers multiple valves)
    const getAutoSelectedOrifice = () => {
        const areaPerValve = currentCase.outputs.requiredArea / numberOfValves;
        for (const orifice of ORIFICE_SIZES) {
            if (orifice.area >= areaPerValve) {
                return orifice;
            }
        }
        return ORIFICE_SIZES[ORIFICE_SIZES.length - 1]; // Return largest if none fit
    };

    // Helper to manage Inlet Network
    const handleAddInletPipe = () => {
        const newPipe: PipeProps = {
            id: uuidv4(),
            name: `Pipe-${(localInletNetwork?.pipes.length || 0) + 1}`,
            startNodeId: 'start',
            endNodeId: 'end',
            length: 10,
            diameter: 100,
            elevation: 0,
        };

        const updatedNetwork: PipelineNetwork = {
            nodes: localInletNetwork?.nodes || [],
            pipes: [...(localInletNetwork?.pipes || []), newPipe],
        };

        setLocalInletNetwork(updatedNetwork);
        setIsDirty(true);
        setIsCalculated(false);
        setNetworkDirty(true);
    };

    const handleAddOutletPipe = () => {
        const newPipe: PipeProps = {
            id: uuidv4(),
            name: `Pipe-${(localOutletNetwork?.pipes.length || 0) + 1}`,
            startNodeId: 'start',
            endNodeId: 'end',
            length: 10,
            diameter: 150,
            elevation: 0,
        };

        const updatedNetwork: PipelineNetwork = {
            nodes: localOutletNetwork?.nodes || [],
            pipes: [...(localOutletNetwork?.pipes || []), newPipe],
        };

        setLocalOutletNetwork(updatedNetwork);
        setIsDirty(true);
        setIsCalculated(false);
        setNetworkDirty(true);
    };

    const handleEditPipe = (id: string, type: 'inlet' | 'outlet') => {
        const network = type === 'inlet' ? localInletNetwork : localOutletNetwork;
        const pipe = network?.pipes.find(p => p.id === id);
        if (pipe) {
            setEditingPipe(pipe);
            setEditingPipeType(type);
            setPipeEditorOpen(true);
        }
    };

    const handleSavePipe = (updatedPipe: PipeProps) => {
        if (editingPipeType === 'inlet') {
            if (!localInletNetwork) return;
            const updatedNetwork = {
                ...localInletNetwork,
                pipes: localInletNetwork.pipes.map(p => p.id === updatedPipe.id ? updatedPipe : p),
            };
            setLocalInletNetwork(updatedNetwork);
        } else {
            if (!localOutletNetwork) return;
            const updatedNetwork = {
                ...localOutletNetwork,
                pipes: localOutletNetwork.pipes.map(p => p.id === updatedPipe.id ? updatedPipe : p),
            };
            setLocalOutletNetwork(updatedNetwork);
        }
        setPipeEditorOpen(false);
        setEditingPipe(null);
        setIsDirty(true);
        setIsCalculated(false);
        setNetworkDirty(true);
    };

    const handleDeletePipe = (id: string, type: 'inlet' | 'outlet') => {
        if (type === 'inlet') {
            if (!localInletNetwork) return;
            const updatedNetwork = {
                ...localInletNetwork,
                pipes: localInletNetwork.pipes.filter((p: PipeProps) => p.id !== id),
            };
            setLocalInletNetwork(updatedNetwork);
        } else {
            if (!localOutletNetwork) return;
            const updatedNetwork = {
                ...localOutletNetwork,
                pipes: localOutletNetwork.pipes.filter((p: PipeProps) => p.id !== id),
            };
            setLocalOutletNetwork(updatedNetwork);
        }
        setIsDirty(true);
        setIsCalculated(false);
        setNetworkDirty(true);
    };

    // Calculate using API-520/521 equations
    const handleCalculate = async () => {
        // Validate inputs first
        const validation = validateSizingInputs(currentCase.method, currentCase.inputs);
        setValidationResult(validation);

        if (!validation.isValid) {
            // Don't proceed with calculation if validation fails
            return;
        }

        setIsCalculating(true);

        // Small delay for UI feedback
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            // Common fluid properties for validation
            const fluid: FluidProperties = {
                phase: currentCase.method === 'gas' ? 'gas' :
                    currentCase.method === 'liquid' ? 'liquid' :
                        currentCase.method === 'two_phase' ? 'two_phase' : 'gas',
                temperature: currentCase.inputs.temperature,
                pressure: currentCase.inputs.pressure,
                molecularWeight: currentCase.inputs.molecularWeight,
                compressibilityZ: currentCase.inputs.compressibilityZ,
                specificHeatRatio: currentCase.inputs.specificHeatRatio,
                gasViscosity: currentCase.inputs.gasViscosity || currentCase.inputs.viscosity,
                liquidDensity: currentCase.inputs.liquidDensity || currentCase.inputs.density,
                liquidViscosity: currentCase.inputs.liquidViscosity || currentCase.inputs.viscosity,
            };

            // Prepare inputs for sizing (may be updated by hydraulic calcs)
            let updatedInputs = { ...currentCase.inputs };

            // === PHASE 1: Inlet Pressure Drop Validation ===
            let inletValidation;
            let outletDropKPa: number | undefined;

            console.group('[PSV Sizing] Hydraulic Calculations');

            // Collect all warnings from both networks
            const allWarnings: string[] = [];

            // Determine flow rate for hydraulic calculations
            // 'relieving' = mass flow rate from scenario, 'rated' = rated capacity of selected valve
            const hydraulicFlowRate = hydraulicFlowSource === 'rated'
                ? (currentCase.outputs?.ratedCapacity ?? currentCase.inputs.massFlowRate)
                : currentCase.inputs.massFlowRate;

            console.log('Hydraulic Flow Source:', hydraulicFlowSource);
            console.log('Hydraulic Flow Rate (kg/h):', hydraulicFlowRate);

            if (localInletNetwork?.pipes?.length) {
                console.log('--- INLET NETWORK ---');
                const inletResult = calculateNetworkPressureDropWithWarnings(
                    localInletNetwork,
                    hydraulicFlowRate,
                    fluid,
                    {
                        boundaryPressure: currentCase.inputs.pressure,
                        boundaryPressureUnit: 'barg',
                        boundaryTemperature: currentCase.inputs.temperature,
                        boundaryTemperatureUnit: 'C',
                        direction: 'forward',
                    }
                );

                console.log('Inlet Drop (kPa):', inletResult.pressureDropKPa);
                setInletHydraulicResult(inletResult);

                // Collect inlet warnings
                if (inletResult.warnings.length > 0) {
                    allWarnings.push(...inletResult.warnings.map(w => `Inlet: ${w}`));
                }

                inletValidation = validateInletPressureDrop(
                    inletResult.pressureDropKPa,
                    currentCase.inputs.pressure
                );
            } else {
                console.log('--- INLET NETWORK --- (no pipes)');
                setInletHydraulicResult(null);
            }

            // === PHASE 2: Outlet Backpressure Calculation ===
            // Calculate outlet pressure drop if pipes exist

            if (localOutletNetwork?.pipes?.length) {
                console.log('--- OUTLET NETWORK ---');
                console.log('Backpressure Source:', currentCase.inputs.backpressureSource);
                console.log('Destination Pressure:', currentCase.inputs.destinationPressure);
                console.log('Outlet Pipes:', localOutletNetwork.pipes.map(p => ({
                    id: p.id,
                    name: p.name,
                    diameter: p.diameter,
                    length: p.length,
                    roughness: p.roughness,
                    elevation: p.elevation,
                    fittings: p.fittings?.length || 0,
                })));

                const outletResult = calculateNetworkPressureDropWithWarnings(
                    localOutletNetwork,
                    hydraulicFlowRate,
                    fluid,
                    {
                        boundaryPressure: currentCase.inputs.destinationPressure || 0,
                        boundaryPressureUnit: 'barg',
                        boundaryTemperature: currentCase.inputs.temperature,
                        boundaryTemperatureUnit: 'C',
                        direction: 'backward',
                    }
                );

                outletDropKPa = outletResult.pressureDropKPa;
                console.log('Outlet Drop (kPa):', outletDropKPa);
                setOutletHydraulicResult(outletResult);

                // Collect choked flow warnings
                if (outletResult.warnings.length > 0) {
                    allWarnings.push(...outletResult.warnings.map(w => `Outlet: ${w}`));
                }

                // Only update backpressure if mode is 'calculated'
                if (currentCase.inputs.backpressureSource === 'calculated' && Number.isFinite(outletDropKPa)) {
                    const calculatedBackpressure = (currentCase.inputs.destinationPressure || 0) + (outletDropKPa / 100);
                    console.log('Calculated Backpressure (barg):', calculatedBackpressure);

                    // Update inputs for the main sizing calculation
                    updatedInputs = {
                        ...updatedInputs,
                        backpressure: calculatedBackpressure,
                        calculatedBackpressure,
                        backpressureType: 'built_up' // Auto-set to built-up since we calculated it
                    };
                }
            } else {
                console.log('--- OUTLET NETWORK --- (no pipes)');
                setOutletHydraulicResult(null);
            }

            // Update hydraulic warnings state
            setHydraulicWarnings(allWarnings);

            console.groupEnd();

            // === PHASE 3: Run PSV Sizing Calculation ===
            const baseOutputs = calculateSizing(updatedInputs, currentCase.method);

            // Adjust outputs for multiple valves
            // Re-select orifice based on per-valve required area
            const requiredAreaPerValve = baseOutputs.requiredArea / numberOfValves;

            // Find the smallest orifice that fits the per-valve area
            let selectedOrificeForValves = ORIFICE_SIZES[ORIFICE_SIZES.length - 1]; // Default to largest
            for (const orifice of ORIFICE_SIZES) {
                if (orifice.area >= requiredAreaPerValve) {
                    selectedOrificeForValves = orifice;
                    break;
                }
            }

            // Calculate percent used based on per-valve area vs selected orifice
            const percentUsedPerValve = (requiredAreaPerValve / selectedOrificeForValves.area) * 100;

            // Filter out the "exceeds largest standard orifice" warning if multi-valve makes it fit
            let adjustedMessages = baseOutputs.messages;
            if (numberOfValves > 1 && percentUsedPerValve <= 100) {
                adjustedMessages = adjustedMessages.filter(
                    msg => !msg.includes('WARNING: Required area exceeds largest standard orifice')
                );
            }

            // Add high utilization warning if per-valve utilization is high
            if (percentUsedPerValve > 90 && percentUsedPerValve <= 100) {
                const hasHighUtilWarning = adjustedMessages.some(msg => msg.includes('High orifice utilization'));
                if (!hasHighUtilWarning) {
                    adjustedMessages = [...adjustedMessages, `NOTE: High orifice utilization (${percentUsedPerValve.toFixed(1)}%)`];
                }
            }

            // Calculate rated capacity correctly:
            // ratedCapacity = massFlowRate × (totalValveArea / requiredArea)
            // where totalValveArea = numberOfValves × selectedOrificeArea
            const totalValveArea = numberOfValves * selectedOrificeForValves.area;
            const calculatedRatedCapacity = updatedInputs.massFlowRate * (totalValveArea / baseOutputs.requiredArea);

            const outputs = {
                ...baseOutputs,
                selectedOrifice: selectedOrificeForValves.designation,
                orificeArea: selectedOrificeForValves.area,
                percentUsed: Math.round(percentUsedPerValve * 10) / 10,
                ratedCapacity: Math.round(calculatedRatedCapacity),
                numberOfValves: numberOfValves,
                messages: adjustedMessages,
            };

            // === PHASE 4: Merge validation results with outputs ===
            // Calculate actual pressure drops for display
            // IMPORTANT: All pressure values must be in barg (base unit) for toDisplay() to work correctly
            let inletPressureDropBarg: number | undefined;
            let outletPressureDropBarg: number | undefined;
            let builtUpBackpressureBarg: number | undefined;

            // Get inlet pressure drop in barg
            if (inletValidation?.inletPressureDropPercent !== undefined && currentCase.inputs.pressure) {
                // percent = (drop / setPressure) * 100
                // So drop (barg) = percent * setPressure (barg) / 100
                inletPressureDropBarg = (inletValidation.inletPressureDropPercent * currentCase.inputs.pressure) / 100;
            }

            // Get outlet pressure drop and backpressure
            // Show outlet ΔP regardless of backpressure source mode if pipes exist
            if (localOutletNetwork?.pipes?.length && outletDropKPa !== undefined) {
                // Convert kPa to bar (1 bar = 100 kPa)
                outletPressureDropBarg = outletDropKPa / 100;

                // Total Backpressure = Destination Pressure + Outlet Pressure Drop
                // Only calculate built-up backpressure if mode is 'calculated'
                if (currentCase.inputs.backpressureSource === 'calculated') {
                    builtUpBackpressureBarg = (currentCase.inputs.destinationPressure || 0) + outletPressureDropBarg;
                }
            }

            const finalOutputs = {
                ...outputs,
                inletPressureDrop: inletPressureDropBarg,
                inletPressureDropPercent: inletValidation?.inletPressureDropPercent,
                inletValidation: inletValidation ? {
                    isValid: inletValidation.isValid,
                    message: inletValidation.message,
                    severity: inletValidation.severity,
                } : undefined,
                outletPressureDrop: outletPressureDropBarg,
                builtUpBackpressure: builtUpBackpressureBarg,
            };

            setCurrentCase({
                ...currentCase,
                inputs: updatedInputs, // Save updated inputs (backpressure)
                outputs: finalOutputs,
                status: 'calculated',
                updatedAt: new Date().toISOString(),
            });

            // Mark as calculated and not dirty
            setIsCalculated(true);
            setIsDirty(false);
        } catch (error) {
            console.error('Calculation error:', error);
            setCurrentCase({
                ...currentCase,
                outputs: {
                    ...currentCase.outputs,
                    messages: ['ERROR: Calculation failed. Check input values.'],
                },
            });
        }

        setIsCalculating(false);
    };

    // Save and close
    const handleSaveAndClose = () => {
        // Include numberOfValves in the saved outputs
        const caseToSave = {
            ...currentCase,
            outputs: {
                ...currentCase.outputs,
                numberOfValves,
            },
        };
        onSaveNetworks?.(localInletNetwork, localOutletNetwork, networkDirty);

        // Save unit preferences
        const finalCase = {
            ...caseToSave,
            unitPreferences: preferences
        };

        onSave(finalCase, { networkChanged: networkDirty });
        setNetworkDirty(false);
        onClose();
    };

    const isLiquidOrTwoPhase = currentCase.method === 'liquid' || currentCase.method === 'two_phase';

    return (
        <Box sx={{ height: '100vh - 20', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
            {/* Toolbar */}
            <Paper square sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={onClose} edge="start">
                        <ArrowBack />
                    </IconButton>
                    <Box>
                        <Typography variant="h6" fontWeight={600}>
                            Sizing Case: {currentCase.revisionNo}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {currentCase.standard} • {currentCase.method}
                        </Typography>
                    </Box>
                    {isDirty && (
                        <Chip
                            label="Edited"
                            size="small"
                            color="warning"
                            variant="outlined"
                        />
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" onClick={onClose}>
                        {canEdit ? 'Cancel' : 'Close'}
                    </Button>
                    {canEdit && (
                        isCalculated && !isDirty ? (
                            <Button
                                variant="contained"
                                color="success"
                                onClick={handleSaveAndClose}
                                startIcon={<CheckCircle />}
                            >
                                Save & Close
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                onClick={handleCalculate}
                                disabled={!isDirty || isCalculating}
                                startIcon={<Calculate />}
                            >
                                {isCalculating ? 'Calculating...' : 'Calculate'}
                            </Button>
                        )
                    )}
                </Box>
            </Paper>

            {/* Validation Errors/Warnings */}
            {validationResult && !validationResult.isValid && (
                <Alert
                    severity="error"
                    sx={{ mt: 1, mx: 2 }}
                    onClose={() => setValidationResult(null)}
                >
                    <Typography variant="subtitle2" fontWeight={600}>
                        Please fix the following errors before calculating:
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                        {validationResult.errors.map((error, idx) => (
                            <li key={idx}>
                                <strong>{getFieldLabel(error.field)}:</strong> {error.message}
                            </li>
                        ))}
                    </Box>
                </Alert>
            )}
            {validationResult?.warnings && validationResult.warnings.length > 0 && validationResult.isValid && (
                <Alert
                    severity="warning"
                    sx={{ mt: 1, mx: 2 }}
                    onClose={() => setValidationResult(null)}
                >
                    <Typography variant="subtitle2" fontWeight={600}>
                        Warnings (calculation will proceed):
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                        {validationResult.warnings.map((warning, idx) => (
                            <li key={idx}>
                                <strong>{getFieldLabel(warning.field)}:</strong> {warning.message}
                            </li>
                        ))}
                    </Box>
                </Alert>
            )}

            {isCalculating && <LinearProgress />}

            {/* Tabs */}
            <Paper square sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Tabs value={activeTab} onChange={handleTabChange} sx={{ flex: 1 }}>
                    <Tab label="Conditions" />
                    <Tab label="PSV Sizing" />
                    <Tab label="Inlet Piping" />
                    <Tab label="Outlet Piping" />
                    <Tab label="Results" />
                </Tabs>
                {canEdit && (
                    <Tooltip title="Delete Sizing Case">
                        <IconButton onClick={() => setDeleteDialogOpen(true)} color="error" sx={{ mr: 2 }}>
                            <Delete />
                        </IconButton>
                    </Tooltip>
                )}
            </Paper>

            {/* Content Area */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                {/* ==================== TAB 0: CONDITIONS ==================== */}
                <TabPanel value={activeTab} index={0}>
                    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Relieving Conditions</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Enter the fluid properties and operating conditions for this sizing case.
                        </Typography>

                        {/* Flow Conditions */}
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                                    Flow Conditions
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                                    <TextField
                                        label="Mass Flow Rate"
                                        type="number"
                                        value={toDisplay(currentCase.inputs.massFlowRate, 'flow')}
                                        onChange={(e) => handleInputChange('massFlowRate', e.target.value, 'flow')}
                                        slotProps={{
                                            input: {
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <TextField
                                                            select
                                                            variant="standard"
                                                            value={preferences.flow}
                                                            onChange={(e) => setUnit('flow', e.target.value)}
                                                            sx={{ minWidth: 60 }}
                                                        >
                                                            {FLOW_UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                                                        </TextField>
                                                    </InputAdornment>
                                                ),
                                            }
                                        }}
                                        fullWidth
                                    />
                                    <TextField
                                        label="Sizing Method"
                                        select
                                        value={currentCase.method}
                                        onChange={(e) => {
                                            setCurrentCase({ ...currentCase, method: e.target.value as SizingCase['method'] });
                                            setIsDirty(true);
                                            setIsCalculated(false);
                                        }}
                                        fullWidth
                                    >
                                        <MenuItem value="gas">Gas / Vapor</MenuItem>
                                        <MenuItem value="liquid">Liquid</MenuItem>
                                        <MenuItem value="steam">Steam</MenuItem>
                                        <MenuItem value="two_phase">Two-Phase</MenuItem>
                                    </TextField>
                                </Box>

                                {/* Vapor Fraction - only for two-phase */}
                                {currentCase.method === 'two_phase' && (
                                    <Box sx={{ mt: 2 }}>
                                        <TextField
                                            label="Vapor Mass Fraction"
                                            type="number"
                                            value={currentCase.inputs.vaporFraction !== undefined ? currentCase.inputs.vaporFraction * 100 : ''}
                                            onChange={(e) => handleInputChange('vaporFraction', parseFloat(e.target.value) / 100)}
                                            slotProps={{
                                                htmlInput: { step: 0.1, min: 0, max: 100 },
                                                input: {
                                                    endAdornment: <InputAdornment position="end">%</InputAdornment>
                                                }
                                            }}
                                            helperText="Percentage of vapor by mass (0-100%)"
                                            fullWidth
                                        />
                                    </Box>
                                )}
                            </CardContent>
                        </Card>

                        {/* Pressure & Temperature */}
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                                    Pressure & Temperature
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                                    <TextField
                                        label="Relieving Pressure"
                                        type="number"
                                        value={toDisplay(currentCase.inputs.pressure, 'pressure')}
                                        onChange={(e) => handleInputChange('pressure', e.target.value, 'pressure')}
                                        slotProps={{
                                            input: {
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <TextField
                                                            select
                                                            variant="standard"
                                                            value={preferences.pressure}
                                                            onChange={(e) => setUnit('pressure', e.target.value)}
                                                            sx={{ minWidth: 60 }}
                                                        >
                                                            {PRESSURE_UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                                                        </TextField>
                                                    </InputAdornment>
                                                ),
                                            }
                                        }}
                                        fullWidth
                                    />
                                    <TextField
                                        label="Relieving Temperature"
                                        type="number"
                                        value={toDisplay(currentCase.inputs.temperature, 'temperature')}
                                        onChange={(e) => handleInputChange('temperature', e.target.value, 'temperature')}
                                        slotProps={{
                                            input: {
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <TextField
                                                            select
                                                            variant="standard"
                                                            value={preferences.temperature}
                                                            onChange={(e) => setUnit('temperature', e.target.value)}
                                                            sx={{ minWidth: 60 }}
                                                        >
                                                            {TEMPERATURE_UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                                                        </TextField>
                                                    </InputAdornment>
                                                ),
                                            }
                                        }}
                                        fullWidth
                                    />
                                </Box>
                            </CardContent>
                        </Card>


                        {/* Gas Phase Properties */}
                        {(currentCase.method === 'gas' || currentCase.method === 'steam' || currentCase.method === 'two_phase') && (
                            <Card sx={{ mb: 3 }}>
                                <CardContent>
                                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                                        Gas/Vapor Phase Properties
                                    </Typography>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                                        <TextField
                                            label="Molecular Weight"
                                            type="number"
                                            value={currentCase.inputs.molecularWeight}
                                            onChange={(e) => handleInputChange('molecularWeight', parseFloat(e.target.value))}
                                            slotProps={{
                                                input: {
                                                    endAdornment: <InputAdornment position="end">g/mol</InputAdornment>
                                                }
                                            }}
                                            fullWidth
                                        />
                                        <TextField
                                            label="Compressibility (Z)"
                                            type="number"
                                            value={currentCase.inputs.compressibilityZ}
                                            onChange={(e) => handleInputChange('compressibilityZ', parseFloat(e.target.value))}
                                            slotProps={{ htmlInput: { step: 0.01, min: 0, max: 2 } }}
                                            fullWidth
                                        />
                                        <TextField
                                            label="Specific Heat Ratio (k)"
                                            type="number"
                                            value={currentCase.inputs.specificHeatRatio}
                                            onChange={(e) => handleInputChange('specificHeatRatio', parseFloat(e.target.value))}
                                            slotProps={{ htmlInput: { step: 0.01, min: 1, max: 2 } }}
                                            fullWidth
                                        />
                                    </Box>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
                                        <TextField
                                            label="Gas Viscosity"
                                            type="number"
                                            value={toDisplay(currentCase.inputs.gasViscosity || currentCase.inputs.viscosity, 'viscosity')}
                                            onChange={(e) => handleInputChange('gasViscosity', e.target.value, 'viscosity')}
                                            slotProps={{
                                                input: {
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <TextField
                                                                select
                                                                variant="standard"
                                                                value={preferences.viscosity}
                                                                onChange={(e) => setUnit('viscosity', e.target.value)}
                                                                sx={{ minWidth: 60 }}
                                                            >
                                                                {VISCOSITY_UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                                                            </TextField>
                                                        </InputAdornment>
                                                    ),
                                                }
                                            }}
                                            fullWidth
                                        />
                                        <Box /> {/* Empty space */}
                                    </Box>
                                </CardContent>
                            </Card>
                        )}

                        {/* Liquid Phase Properties */}
                        {(currentCase.method === 'liquid' || currentCase.method === 'two_phase') && (
                            <Card sx={{ mb: 3 }}>
                                <CardContent>
                                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                                        Liquid Phase Properties
                                    </Typography>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                                        <TextField
                                            label="Liquid Density"
                                            type="number"
                                            value={toDisplay(currentCase.inputs.liquidDensity || currentCase.inputs.density, 'density')}
                                            onChange={(e) => handleInputChange('liquidDensity', e.target.value, 'density')}
                                            slotProps={{
                                                input: {
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <TextField
                                                                select
                                                                variant="standard"
                                                                value={preferences.density}
                                                                onChange={(e) => setUnit('density', e.target.value)}
                                                                sx={{ minWidth: 70 }}
                                                            >
                                                                {DENSITY_UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                                                            </TextField>
                                                        </InputAdornment>
                                                    ),
                                                }
                                            }}
                                            fullWidth
                                        />
                                        <TextField
                                            label="Liquid Viscosity"
                                            type="number"
                                            value={toDisplay(currentCase.inputs.liquidViscosity || currentCase.inputs.viscosity, 'viscosity')}
                                            onChange={(e) => handleInputChange('liquidViscosity', e.target.value, 'viscosity')}
                                            slotProps={{
                                                input: {
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <TextField
                                                                select
                                                                variant="standard"
                                                                value={preferences.viscosity}
                                                                onChange={(e) => setUnit('viscosity', e.target.value)}
                                                                sx={{ minWidth: 60 }}
                                                            >
                                                                {VISCOSITY_UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                                                            </TextField>
                                                        </InputAdornment>
                                                    ),
                                                }
                                            }}
                                            fullWidth
                                        />
                                    </Box>
                                </CardContent>
                            </Card>
                        )}

                        {/* Backpressure & Hydraulic Validation */}
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <Typography variant="subtitle1" fontWeight={600}>
                                        Backpressure & Hydraulic Validation
                                    </Typography>
                                    <Tooltip
                                        title={
                                            <Box>
                                                <Typography variant="body2" fontWeight={600} gutterBottom>
                                                    Backpressure Types:
                                                </Typography>
                                                <Typography variant="body2" gutterBottom>
                                                    • <strong>Superimposed:</strong> Constant backpressure that exists in the discharge system before the valve opens (e.g., from a header or atmospheric pressure).
                                                </Typography>
                                                <Typography variant="body2">
                                                    • <strong>Built-up:</strong> Backpressure that develops in the discharge system only after the valve opens, caused by flow resistance.
                                                </Typography>
                                            </Box>
                                        }
                                        arrow
                                        placement="right"
                                    >
                                        <HelpOutline sx={{ fontSize: 18, color: 'text.secondary', cursor: 'help' }} />
                                    </Tooltip>
                                </Box>

                                {/* Backpressure Source Toggle */}
                                <FormControl component="fieldset" sx={{ mb: 2 }}>
                                    <FormLabel component="legend">Backpressure Source</FormLabel>
                                    <RadioGroup
                                        row
                                        value={currentCase.inputs.backpressureSource || 'manual'}
                                        onChange={(e) => {
                                            setCurrentCase({
                                                ...currentCase,
                                                inputs: {
                                                    ...currentCase.inputs,
                                                    backpressureSource: e.target.value as 'manual' | 'calculated',
                                                },
                                            });
                                            setIsDirty(true);
                                            setIsCalculated(false);
                                        }}
                                    >
                                        <FormControlLabel value="manual" control={<Radio />} label="Manual Entry" />
                                        <FormControlLabel value="calculated" control={<Radio />} label="Calculate from Outlet Piping" />
                                    </RadioGroup>
                                </FormControl>

                                {/* Manual Backpressure Input */}
                                {currentCase.inputs.backpressureSource !== 'calculated' && (
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
                                        <TextField
                                            label="Backpressure"
                                            type="number"
                                            value={toDisplay(currentCase.inputs.backpressure, 'pressure')}
                                            onChange={(e) => handleInputChange('backpressure', e.target.value, 'pressure')}
                                            slotProps={{
                                                input: {
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <TextField
                                                                select
                                                                variant="standard"
                                                                value={preferences.pressure}
                                                                onChange={(e) => setUnit('pressure', e.target.value)}
                                                                sx={{ minWidth: 60 }}
                                                            >
                                                                {PRESSURE_UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                                                            </TextField>
                                                        </InputAdornment>
                                                    ),
                                                }
                                            }}
                                            fullWidth
                                        />
                                        <TextField
                                            label="Backpressure Type"
                                            select
                                            value={currentCase.inputs.backpressureType}
                                            onChange={(e) => handleInputChange('backpressureType', e.target.value)}
                                            fullWidth
                                        >
                                            <MenuItem value="superimposed">Superimposed</MenuItem>
                                            <MenuItem value="built_up">Built-up</MenuItem>
                                        </TextField>
                                    </Box>
                                )}

                                {/* Display Calculated Backpressure (if mode is calculated) */}
                                {currentCase.inputs.backpressureSource === 'calculated' && (
                                    <Box sx={{ mb: 2 }}>
                                        {/* Destination Pressure Input */}
                                        <TextField
                                            label="Destination Pressure"
                                            type="number"
                                            value={toDisplay(currentCase.inputs.destinationPressure || 0, 'pressure')}
                                            onChange={(e) => handleInputChange('destinationPressure', e.target.value, 'pressure')}
                                            slotProps={{
                                                input: {
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <TextField
                                                                select
                                                                variant="standard"
                                                                value={preferences.pressure}
                                                                onChange={(e) => setUnit('pressure', e.target.value)}
                                                                sx={{ minWidth: 60 }}
                                                            >
                                                                {PRESSURE_UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                                                            </TextField>
                                                        </InputAdornment>
                                                    ),
                                                }
                                            }}
                                            helperText="Pressure at outlet discharge point (e.g., flare header, atmospheric)"
                                            fullWidth
                                            sx={{ mb: 2 }}
                                        />

                                        {/* Show calculated result */}
                                        {currentCase.inputs.calculatedBackpressure !== undefined && (
                                            <Alert severity="success">
                                                <Typography variant="body2" fontWeight={600}>
                                                    Calculated Built-up Backpressure: {currentCase.inputs.calculatedBackpressure.toFixed(3)} barg
                                                </Typography>
                                                <Typography variant="caption">
                                                    Based on {localOutletNetwork?.pipes?.length || 0} pipes in outlet network.
                                                </Typography>
                                            </Alert>
                                        )}

                                        {/* Prompt to add pipes if none */}
                                        {(!localOutletNetwork || !localOutletNetwork.pipes || localOutletNetwork.pipes.length === 0) && (
                                            <Alert severity="info">
                                                <Typography variant="body2">
                                                    Add pipes to the Outlet Piping tab to calculate backpressure.
                                                </Typography>
                                            </Alert>
                                        )}
                                    </Box>
                                )}

                                {/* Inlet Pressure Drop Validation */}
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="body2" fontWeight={600} color="text.secondary" gutterBottom>
                                        Inlet Pressure Drop Validation
                                    </Typography>
                                    {currentCase.outputs?.inletValidation ? (
                                        <Alert
                                            severity={currentCase.outputs?.inletValidation?.severity}
                                            icon={currentCase.outputs?.inletValidation?.isValid ? <CheckCircle /> : <Warning />}
                                        >
                                            <Typography variant="body2">
                                                {currentCase.outputs?.inletPressureDrop !== undefined
                                                    ? toDisplayDelta(currentCase.outputs.inletPressureDrop, 'pressure', 3)
                                                    : '—'} {getDeltaUnit('pressure') + " "}
                                                ({currentCase.outputs?.inletPressureDropPercent?.toFixed(2) || '—'}% of set pressure)
                                            </Typography>
                                            <Typography variant="caption">
                                                {currentCase.outputs.inletValidation.message}
                                            </Typography>
                                        </Alert>
                                    ) : (
                                        <Alert severity="info">
                                            <Typography variant="body2">
                                                Run calculation to validate inlet pressure drop.
                                            </Typography>
                                            <Typography variant="caption">
                                                API 520 guideline: Inlet ΔP should be &lt; 3% of set pressure to avoid valve chattering.
                                            </Typography>
                                        </Alert>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                </TabPanel>

                {/* ==================== TAB 2: INLET PIPING ==================== */}
                <TabPanel value={activeTab} index={2}>
                    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Inlet Pipeline Configuration</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Define the pipe segments from the protected equipment to the PSV inlet.
                        </Typography>

                        {/* Flow Rate Source Toggle */}
                        <Card sx={{ mb: 3, p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        Hydraulic Calculation Flow Rate
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Select which flow rate to use for inlet/outlet pressure drop calculations
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <RadioGroup
                                        row
                                        value={hydraulicFlowSource}
                                        onChange={(e) => {
                                            setHydraulicFlowSource(e.target.value as 'relieving' | 'rated');
                                            setIsDirty(true);
                                            setIsCalculated(false);
                                        }}
                                    >
                                        <FormControlLabel
                                            value="relieving"
                                            control={<Radio size="small" />}
                                            label={
                                                <Box>
                                                    <Typography variant="body2" fontWeight={500}>Relieving Rate</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {toDisplay(currentCase.inputs.massFlowRate, 'flow').toLocaleString()} {preferences.flow}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                        <FormControlLabel
                                            value="rated"
                                            control={<Radio size="small" />}
                                            label={
                                                <Box>
                                                    <Typography variant="body2" fontWeight={500}>Rated Capacity</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {currentCase.outputs?.ratedCapacity
                                                            ? `${toDisplay(currentCase.outputs.ratedCapacity, 'flow').toLocaleString()} ${preferences.flow}`
                                                            : 'Calculate first'
                                                        }
                                                    </Typography>
                                                </Box>
                                            }
                                            disabled={!currentCase.outputs?.ratedCapacity}
                                        />
                                    </RadioGroup>
                                </Box>
                            </Box>
                        </Card>

                        {/* ===== INLET HYDRAULIC SUMMARY ===== */}
                        {(localInletNetwork?.pipes?.length ?? 0) > 0 && (
                            <Card sx={{
                                mb: 3,
                                background: isDark
                                    ? 'rgba(15, 23, 42, 0.6)'
                                    : 'rgba(255, 255, 255, 0.8)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                borderRadius: 3,
                            }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography variant="subtitle1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Timeline sx={{ color: 'primary.main' }} />
                                            Hydraulic Summary
                                        </Typography>
                                        {currentCase.outputs?.inletValidation && (
                                            <Chip
                                                icon={currentCase.outputs.inletValidation.isValid ? <CheckCircle /> : currentCase.outputs.inletValidation.severity === 'warning' ? <Warning /> : <ErrorIcon />}
                                                label={currentCase.outputs.inletValidation.isValid ? 'PASS' : currentCase.outputs.inletValidation.severity === 'warning' ? 'WARNING' : 'FAIL'}
                                                color={currentCase.outputs.inletValidation.isValid ? 'success' : currentCase.outputs.inletValidation.severity === 'warning' ? 'warning' : 'error'}
                                                size="small"
                                            />
                                        )}
                                    </Box>

                                    {/* Metrics Grid */}
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                                        gap: 2,
                                        mb: 2
                                    }}>
                                        {/* Total Pressure Drop (kPa) */}
                                        <Box sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                            textAlign: 'center'
                                        }}>
                                            <Typography variant="h5" fontWeight={700} color={
                                                currentCase.outputs?.inletPressureDropPercent !== undefined
                                                    ? currentCase.outputs.inletPressureDropPercent < 3 ? 'success.main'
                                                        : currentCase.outputs.inletPressureDropPercent < 5 ? 'warning.main' : 'error.main'
                                                    : 'primary.main'
                                            }>
                                                {currentCase.outputs?.inletPressureDrop !== undefined
                                                    ? `${toDisplayDelta(currentCase.outputs.inletPressureDrop, 'pressure', 3)}`
                                                    : '—'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Total ΔP ({getDeltaUnit('pressure')})
                                            </Typography>
                                        </Box>

                                        {/* Percentage of Set Pressure */}
                                        <Box sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                            textAlign: 'center'
                                        }}>
                                            <Typography variant="h5" fontWeight={700} color={
                                                currentCase.outputs?.inletPressureDropPercent !== undefined
                                                    ? currentCase.outputs.inletPressureDropPercent < 3 ? 'success.main'
                                                        : currentCase.outputs.inletPressureDropPercent < 5 ? 'warning.main' : 'error.main'
                                                    : 'text.primary'
                                            }>
                                                {currentCase.outputs?.inletPressureDropPercent !== undefined
                                                    ? `${currentCase.outputs.inletPressureDropPercent.toFixed(2)}%`
                                                    : '—'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                of Set Pressure (3% max)
                                            </Typography>
                                        </Box>

                                        {/* Total Length */}
                                        <Box sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                            textAlign: 'center'
                                        }}>
                                            <Typography variant="h5" fontWeight={700}>
                                                {localInletNetwork?.pipes?.reduce((sum, p) => sum + (p.length || 0), 0).toFixed(1) || '0'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Total Length (m)
                                            </Typography>
                                        </Box>

                                        {/* Pipe Segments */}
                                        <Box sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                            textAlign: 'center'
                                        }}>
                                            <Typography variant="h5" fontWeight={700}>
                                                {localInletNetwork?.pipes?.length || 0}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Pipe Segments
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Progress Bar */}
                                    {currentCase.outputs?.inletPressureDropPercent !== undefined && (
                                        <Box sx={{ mt: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Inlet ΔP vs 3% Limit
                                                </Typography>
                                                <Typography variant="caption" fontWeight={600} color={
                                                    currentCase.outputs.inletPressureDropPercent < 3 ? 'success.main' :
                                                        currentCase.outputs.inletPressureDropPercent < 5 ? 'warning.main' : 'error.main'
                                                }>
                                                    {currentCase.outputs.inletPressureDropPercent.toFixed(2)}% / 3.00%
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={Math.min((currentCase.outputs.inletPressureDropPercent / 5) * 100, 100)}
                                                sx={{
                                                    height: 8,
                                                    borderRadius: 4,
                                                    bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                                    '& .MuiLinearProgress-bar': {
                                                        borderRadius: 4,
                                                        bgcolor: currentCase.outputs.inletPressureDropPercent < 3
                                                            ? 'success.main'
                                                            : currentCase.outputs.inletPressureDropPercent < 5
                                                                ? 'warning.main'
                                                                : 'error.main',
                                                    }
                                                }}
                                            />
                                            {/* 3% marker */}
                                            <Box sx={{ position: 'relative', height: 0 }}>
                                                <Box sx={{
                                                    position: 'absolute',
                                                    left: '60%',
                                                    top: -12,
                                                    borderLeft: '2px dashed',
                                                    borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                                                    height: 16,
                                                }} />
                                            </Box>
                                        </Box>
                                    )}

                                    {/* No calculation yet message */}
                                    {currentCase.outputs?.inletPressureDropPercent === undefined && (
                                        <Alert severity="info" sx={{ mt: 1 }}>
                                            Click <strong>Calculate</strong> to compute inlet hydraulics.
                                        </Alert>
                                    )}

                                    {/* Choked Flow Warning */}
                                    {inletHydraulicResult?.hasChokedFlow && (
                                        <Alert severity="warning" sx={{ mt: 2 }}>
                                            <strong>Choked Flow Detected:</strong> The inlet piping has choked flow conditions. Hydraulic calculations may be inaccurate.
                                            {inletHydraulicResult.warnings.length > 0 && (
                                                <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                                                    {inletHydraulicResult.warnings.map((w, idx) => (
                                                        <li key={idx}>{w}</li>
                                                    ))}
                                                </Box>
                                            )}
                                        </Alert>
                                    )}

                                    {/* Erosional Velocity Warning */}
                                    {inletHydraulicResult?.segments?.some(s => s.isErosional) && (
                                        <Alert severity="error" sx={{ mt: 2 }}>
                                            <strong>Erosional Velocity Exceeded:</strong> The following pipe segments exceed the erosional velocity limit:
                                            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                                                {inletHydraulicResult.segments.filter(s => s.isErosional).map((seg, idx) => (
                                                    <li key={idx}>{seg.name} ({seg.velocity?.toFixed(1)} m/s)</li>
                                                ))}
                                            </Box>
                                        </Alert>
                                    )}

                                    {/* High Mach Number Warning (> 0.7) */}
                                    {inletHydraulicResult?.segments?.some(s => (s.machNumber ?? 0) > 0.7) && (
                                        <Alert severity="error" sx={{ mt: 2 }}>
                                            <strong>High Mach Number (&gt;0.7):</strong> The following pipe segments have very high Mach numbers. Flow instability and noise may occur:
                                            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                                                {inletHydraulicResult.segments.filter(s => (s.machNumber ?? 0) > 0.7).map((seg, idx) => (
                                                    <li key={idx}>{seg.name} (Mach {seg.machNumber?.toFixed(3)})</li>
                                                ))}
                                            </Box>
                                        </Alert>
                                    )}

                                    {/* Moderate Mach Number Warning (> 0.5, ≤ 0.7) */}
                                    {inletHydraulicResult?.segments?.some(s => (s.machNumber ?? 0) > 0.5 && (s.machNumber ?? 0) <= 0.7) && (
                                        <Alert severity="warning" sx={{ mt: 2 }}>
                                            <strong>Elevated Mach Number (&gt;0.5):</strong> The following pipe segments have elevated Mach numbers. Consider increasing pipe size:
                                            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                                                {inletHydraulicResult.segments.filter(s => (s.machNumber ?? 0) > 0.5 && (s.machNumber ?? 0) <= 0.7).map((seg, idx) => (
                                                    <li key={idx}>{seg.name} (Mach {seg.machNumber?.toFixed(3)})</li>
                                                ))}
                                            </Box>
                                        </Alert>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        <PipelineDataGrid
                            pipes={localInletNetwork?.pipes || []}
                            onAddPipe={handleAddInletPipe}
                            onEditPipe={(id) => handleEditPipe(id, 'inlet')}
                            onDeletePipe={(id) => handleDeletePipe(id, 'inlet')}
                            readOnly={!canEdit}
                        />
                    </Box>
                </TabPanel>

                {/* ==================== TAB 1: PSV SIZING ==================== */}
                <TabPanel value={activeTab} index={1}>
                    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Valve Selection & Sizing</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Configure the PSV parameters and select the appropriate orifice size.
                        </Typography>

                        {/* Sizing Standard */}
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                                    Sizing Standard
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                                    <TextField
                                        label="Design Standard"
                                        select
                                        value={currentCase.standard}
                                        onChange={(e) => {
                                            setCurrentCase({ ...currentCase, standard: e.target.value as SizingCase['standard'] });
                                            setIsDirty(true);
                                            setIsCalculated(false);
                                        }}
                                        fullWidth
                                    >
                                        <MenuItem value="API-520">API-520</MenuItem>
                                        <MenuItem value="API-521">API-521</MenuItem>
                                        <MenuItem value="API-2000">API-2000</MenuItem>
                                        <MenuItem value="ASME-VIII">ASME-VIII</MenuItem>
                                        <MenuItem value="ISO-4126">ISO-4126</MenuItem>
                                    </TextField>
                                    <TextField
                                        label="Sizing Method"
                                        value={currentCase.method.toUpperCase()}
                                        InputProps={{ readOnly: true }}
                                        fullWidth
                                        helperText="Set in Conditions tab"
                                    />
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Valve Parameters */}
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                                    Valve Parameters
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                                    <TextField
                                        label="Discharge Coefficient (Kd)"
                                        type="number"
                                        value={currentCase.inputs?.dischargeCoefficient ?? currentCase.outputs?.dischargeCoefficient ?? ''}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setCurrentCase({
                                                ...currentCase,
                                                inputs: {
                                                    ...currentCase.inputs,
                                                    dischargeCoefficient: isNaN(val) ? undefined : val
                                                }
                                            });
                                            setIsDirty(true);
                                            setIsCalculated(false);
                                        }}
                                        fullWidth
                                        helperText="Per API-520 (0.975 for gas, 0.65 for liquid)"
                                    />
                                    <TextField
                                        label="Backpressure Correction (Kb)"
                                        type="number"
                                        value={currentCase.inputs?.backpressureCorrectionFactor ?? currentCase.outputs?.backpressureCorrectionFactor ?? ''}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setCurrentCase({
                                                ...currentCase,
                                                inputs: {
                                                    ...currentCase.inputs,
                                                    backpressureCorrectionFactor: isNaN(val) ? undefined : val
                                                }
                                            });
                                            setIsDirty(true);
                                            setIsCalculated(false);
                                        }}
                                        fullWidth
                                        helperText="Calculated from backpressure ratio"
                                    />
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Orifice Selection */}
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="subtitle1" fontWeight={600}>
                                        Orifice Selection
                                    </Typography>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={manualOrificeMode}
                                                onChange={(e) => setManualOrificeMode(e.target.checked)}
                                            />
                                        }
                                        label="Manual Selection"
                                    />
                                </Box>

                                {/* Valve Count */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                                    <Typography variant="body2" fontWeight={500}>Number of Valves:</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <IconButton
                                            size="small"
                                            onClick={() => setNumberOfValves(Math.max(1, numberOfValves - 1))}
                                            disabled={numberOfValves <= 1}
                                        >
                                            <Typography fontWeight="bold">−</Typography>
                                        </IconButton>
                                        <Typography variant="h6" fontWeight={600} sx={{ minWidth: 30, textAlign: 'center' }}>
                                            {numberOfValves}
                                        </Typography>
                                        <IconButton
                                            size="small"
                                            onClick={() => setNumberOfValves(numberOfValves + 1)}
                                        >
                                            <Typography fontWeight="bold">+</Typography>
                                        </IconButton>
                                    </Box>
                                    {numberOfValves > 1 && (
                                        <Chip
                                            label={`${numberOfValves} × parallel valves`}
                                            size="small"
                                            color="info"
                                        />
                                    )}
                                </Box>

                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            {numberOfValves > 1 ? 'Required Area (per valve)' : 'Required Area'}
                                        </Typography>
                                        <Typography variant="h5" fontWeight={600} color="primary.main">
                                            {Math.round((currentCase.outputs?.requiredArea ?? 0) / numberOfValves).toLocaleString()} mm²
                                        </Typography>
                                        {numberOfValves > 1 && (
                                            <Typography variant="caption" color="text.secondary">
                                                Total: {(currentCase.outputs?.requiredArea ?? 0).toLocaleString()} mm²
                                            </Typography>
                                        )}
                                    </Box>
                                    <TextField
                                        label="Selected Orifice"
                                        select
                                        value={manualOrificeMode ? currentCase.outputs?.selectedOrifice : getAutoSelectedOrifice().designation}
                                        onChange={(e) => handleOrificeChange(e.target.value)}
                                        disabled={!manualOrificeMode}
                                        fullWidth
                                    >
                                        {ORIFICE_SIZES.map(o => (
                                            <MenuItem
                                                key={o.designation}
                                                value={o.designation}
                                                disabled={o.area < ((currentCase.outputs?.requiredArea ?? 0) / numberOfValves)}
                                            >
                                                {o.designation} — {o.area.toLocaleString()} mm²
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Orifice Area</Typography>
                                        <Typography variant="h5" fontWeight={600}>
                                            {(manualOrificeMode ? currentCase.outputs?.orificeArea : getAutoSelectedOrifice().area).toLocaleString()} mm²
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Utilization Bar */}
                                {(() => {
                                    const areaPerValve = (currentCase.outputs?.requiredArea ?? 0) / numberOfValves;
                                    const selectedOrifice = manualOrificeMode ? (currentCase.outputs?.orificeArea ?? 0) : getAutoSelectedOrifice().area;
                                    const utilization = (areaPerValve / selectedOrifice) * 100;
                                    return (
                                        <Box sx={{ mb: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant="body2">Orifice Utilization</Typography>
                                                <Typography variant="body2" fontWeight={600} color={utilization > 90 ? 'warning.main' : 'success.main'}>
                                                    {utilization.toFixed(1)}%
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={Math.min(utilization, 100)}
                                                color={utilization > 90 ? 'warning' : 'success'}
                                                sx={{ height: 8, borderRadius: 4 }}
                                            />
                                        </Box>
                                    );
                                })()}

                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Chip
                                        icon={currentCase.outputs?.isCriticalFlow ? <CheckCircle /> : <Info />}
                                        label={currentCase.outputs?.isCriticalFlow ? 'Critical Flow' : 'Subcritical Flow'}
                                        color={currentCase.outputs?.isCriticalFlow ? 'success' : 'info'}
                                    />
                                    {(currentCase.outputs?.percentUsed ?? 0) > 90 && (
                                        <Chip
                                            icon={<Warning />}
                                            label="High Utilization"
                                            color="warning"
                                        />
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                </TabPanel>

                {/* ==================== TAB 3: OUTLET PIPING ==================== */}
                <TabPanel value={activeTab} index={3}>
                    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Outlet Pipeline Configuration</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Define the pipe segments from the PSV outlet to the discharge point.
                        </Typography>

                        {/* ===== OUTLET HYDRAULIC SUMMARY ===== */}
                        {(localOutletNetwork?.pipes?.length ?? 0) > 0 && (
                            <Card sx={{
                                mb: 3,
                                background: isDark
                                    ? 'rgba(15, 23, 42, 0.6)'
                                    : 'rgba(255, 255, 255, 0.8)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                borderRadius: 3,
                            }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography variant="subtitle1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Timeline sx={{ color: 'secondary.main' }} />
                                            Outlet Hydraulic Summary
                                        </Typography>
                                        {currentCase.inputs.backpressureSource === 'calculated' && (
                                            <Chip
                                                icon={<Calculate />}
                                                label="Auto-Calculated"
                                                color="info"
                                                size="small"
                                                variant="outlined"
                                            />
                                        )}
                                    </Box>

                                    {/* Metrics Grid */}
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                                        gap: 2,
                                        mb: 2
                                    }}>
                                        {/* Total Outlet Pressure Drop */}
                                        <Box sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                            textAlign: 'center'
                                        }}>
                                            <Typography variant="h5" fontWeight={700} color="secondary.main">
                                                {currentCase.outputs?.outletPressureDrop !== undefined
                                                    ? `${toDisplayDelta(currentCase.outputs.outletPressureDrop, 'pressure', 3)}`
                                                    : '—'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Total ΔP ({getDeltaUnit('pressure')})
                                            </Typography>
                                        </Box>

                                        {/* Built-up Backpressure (Total) */}
                                        <Box sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                            textAlign: 'center'
                                        }}>
                                            <Typography variant="h5" fontWeight={700} color="secondary.main">
                                                {currentCase.outputs?.builtUpBackpressure !== undefined
                                                    ? `${toDisplay(currentCase.outputs.builtUpBackpressure, 'pressure', 3)}`
                                                    : '—'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Built-up BP ({preferences.pressure})
                                            </Typography>
                                        </Box>

                                        {/* Destination Pressure */}
                                        <Box sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                            textAlign: 'center'
                                        }}>
                                            <Typography variant="h5" fontWeight={700}>
                                                {currentCase.inputs.destinationPressure !== undefined
                                                    ? toDisplay(currentCase.inputs.destinationPressure, 'pressure', 3)
                                                    : '0'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Destination ({preferences.pressure})
                                            </Typography>
                                        </Box>

                                        {/* Segment Count */}
                                        <Box sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                            textAlign: 'center'
                                        }}>
                                            <Typography variant="h5" fontWeight={700}>
                                                {localOutletNetwork?.pipes?.length || 0}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Pipe Segments
                                            </Typography>
                                        </Box>

                                        {/* Total Length */}
                                        <Box sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                            textAlign: 'center'
                                        }}>
                                            <Typography variant="h5" fontWeight={700}>
                                                {localOutletNetwork?.pipes?.reduce((sum, p) => sum + (p.length || 0), 0).toFixed(1) || '0'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Total Length (m)
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Calculation mode info */}
                                    {currentCase.inputs.backpressureSource !== 'calculated' && (
                                        <Alert severity="info" sx={{ mt: 1 }}>
                                            Backpressure is set to <strong>Manual Entry</strong>. Switch to &quot;Calculate from Outlet Piping&quot; in the Sizing Setup tab to use these pipe segments.
                                        </Alert>
                                    )}

                                    {currentCase.inputs.backpressureSource === 'calculated' && currentCase.outputs?.builtUpBackpressure === undefined && (
                                        <Alert severity="info" sx={{ mt: 1 }}>
                                            Click <strong>Calculate</strong> to compute outlet backpressure.
                                        </Alert>
                                    )}

                                    {/* Choked flow warning */}
                                    {outletHydraulicResult?.hasChokedFlow && (
                                        <Alert severity="warning" sx={{ mt: 1 }}>
                                            <strong>Choked Flow Detected:</strong> The outlet piping has choked flow conditions. Backpressure calculations may be inaccurate.
                                            {outletHydraulicResult.warnings.length > 0 && (
                                                <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                                                    {outletHydraulicResult.warnings.map((w, idx) => (
                                                        <li key={idx}>{w}</li>
                                                    ))}
                                                </Box>
                                            )}
                                        </Alert>
                                    )}

                                    {/* Erosional Velocity Warning */}
                                    {outletHydraulicResult?.segments?.some(s => s.isErosional) && (
                                        <Alert severity="error" sx={{ mt: 1 }}>
                                            <strong>Erosional Velocity Exceeded:</strong> The following pipe segments exceed the erosional velocity limit:
                                            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                                                {outletHydraulicResult.segments.filter(s => s.isErosional).map((seg, idx) => (
                                                    <li key={idx}>{seg.name} ({seg.velocity?.toFixed(1)} m/s)</li>
                                                ))}
                                            </Box>
                                        </Alert>
                                    )}

                                    {/* High Mach Number Warning (> 0.7) */}
                                    {outletHydraulicResult?.segments?.some(s => (s.machNumber ?? 0) > 0.7) && (
                                        <Alert severity="error" sx={{ mt: 1 }}>
                                            <strong>High Mach Number (&gt;0.7):</strong> The following pipe segments have very high Mach numbers. Flow instability and noise may occur:
                                            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                                                {outletHydraulicResult.segments.filter(s => (s.machNumber ?? 0) > 0.7).map((seg, idx) => (
                                                    <li key={idx}>{seg.name} (Mach {seg.machNumber?.toFixed(3)})</li>
                                                ))}
                                            </Box>
                                        </Alert>
                                    )}

                                    {/* Moderate Mach Number Warning (> 0.5, ≤ 0.7) */}
                                    {outletHydraulicResult?.segments?.some(s => (s.machNumber ?? 0) > 0.5 && (s.machNumber ?? 0) <= 0.7) && (
                                        <Alert severity="warning" sx={{ mt: 1 }}>
                                            <strong>Elevated Mach Number (&gt;0.5):</strong> The following pipe segments have elevated Mach numbers. Consider increasing pipe size:
                                            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                                                {outletHydraulicResult.segments.filter(s => (s.machNumber ?? 0) > 0.5 && (s.machNumber ?? 0) <= 0.7).map((seg, idx) => (
                                                    <li key={idx}>{seg.name} (Mach {seg.machNumber?.toFixed(3)})</li>
                                                ))}
                                            </Box>
                                        </Alert>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        <PipelineDataGrid
                            pipes={localOutletNetwork?.pipes || []}
                            onAddPipe={handleAddOutletPipe}
                            onEditPipe={(id) => handleEditPipe(id, 'outlet')}
                            onDeletePipe={(id) => handleDeletePipe(id, 'outlet')}
                            readOnly={!canEdit}
                        />
                    </Box>
                </TabPanel>

                {/* ==================== TAB 4: RESULTS ==================== */}
                <TabPanel value={activeTab} index={4}>
                    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Calculation Results</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Summary of sizing calculations, pressure drops, and recommendations.
                        </Typography>

                        {/* Summary Card */}
                        <Card sx={{
                            mb: 3,
                            background: isDark
                                ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)'
                                : 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%)',
                            border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(2, 132, 199, 0.15)'}`,
                        }}>
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                                    Sizing Summary
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 3 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <Typography variant="caption" color="text.secondary">Selected Orifice</Typography>
                                        <Typography variant="h3" fontWeight={700} color="primary.main">
                                            {currentCase.outputs?.selectedOrifice ?? '-'}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Orifice Area</Typography>
                                        <Typography variant="h5" fontWeight={600}>
                                            {currentCase.outputs?.orificeArea?.toLocaleString() ?? '-'} mm²
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">% Used</Typography>
                                        <Typography variant="h5" fontWeight={600} color={
                                            ((currentCase.outputs?.requiredArea ?? 0) / (numberOfValves * (currentCase.outputs?.orificeArea ?? 1)) * 100) > 90
                                                ? 'warning.main'
                                                : 'text.primary'
                                        }>
                                            {((currentCase.outputs?.requiredArea ?? 0) / (numberOfValves * (currentCase.outputs?.orificeArea ?? 1)) * 100).toFixed(1)}%
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Rated Capacity</Typography>
                                        <Typography variant="h5" fontWeight={600}>
                                            {(((currentCase.outputs?.ratedCapacity ?? 0) / (currentCase.outputs?.numberOfValves || 1)) * numberOfValves).toLocaleString()} kg/h
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <Typography variant="caption" color="text.secondary">Number of Valves</Typography>
                                        <Typography variant="h5" fontWeight={600}>
                                            {numberOfValves}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Hydraulic Calculations */}
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                                    Hydraulic Calculations
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                                    {/* Inlet Pressure Drop */}
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            Inlet Pressure Drop
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                            <Typography variant="h6" fontWeight={600}>
                                                {currentCase.outputs?.inletPressureDrop !== undefined
                                                    ? `${toDisplayDelta(currentCase.outputs?.inletPressureDrop, 'pressure', 3)}`
                                                    : '—'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {getDeltaUnit('pressure')}
                                            </Typography>
                                        </Box>
                                        <Typography
                                            variant="caption"
                                            color={
                                                currentCase.outputs?.inletPressureDropPercent !== undefined
                                                    ? currentCase.outputs.inletPressureDropPercent > 3 ? 'error.main' : 'success.main'
                                                    : 'text.secondary'
                                            }
                                            fontWeight={500}
                                        >
                                            {currentCase.outputs?.inletPressureDropPercent !== undefined
                                                ? `${currentCase.outputs.inletPressureDropPercent.toFixed(2)}% of Set Pressure`
                                                : 'Requires Inlet Piping'}
                                        </Typography>
                                    </Box>

                                    {/* Backpressure */}
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            Total Backpressure
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                            <Typography variant="h6" fontWeight={600}>
                                                {toDisplay(currentCase.inputs?.backpressure, 'pressure', 3)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {preferences.pressure}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Superimposed: {currentCase.inputs?.destinationPressure
                                                    ? `${toDisplay(currentCase.inputs.destinationPressure, 'pressure', 2)} ${preferences.pressure}`
                                                    : `0 ${preferences.pressure}`}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Built-up: {currentCase.outputs?.builtUpBackpressure
                                                    ? `${toDisplayDelta(currentCase.outputs.builtUpBackpressure, 'pressure', 2)} ${getDeltaUnit('pressure')}`
                                                    : `0 ${getDeltaUnit('pressure')}`}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card >

                        {/* Flow Analysis */}
                        < Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                                    Flow Analysis
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Flow Type</Typography>
                                        <Box sx={{ mt: 0.5 }}>
                                            <Chip
                                                label={currentCase.outputs.isCriticalFlow ? 'Critical Flow' : 'Subcritical Flow'}
                                                color={currentCase.outputs.isCriticalFlow ? 'success' : 'info'}
                                            />
                                        </Box>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Discharge Coefficient</Typography>
                                        <Typography variant="h6" fontWeight={600}>
                                            {currentCase.outputs?.dischargeCoefficient ?? '-'}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">BP Correction Factor</Typography>
                                        <Typography variant="h6" fontWeight={600}>
                                            {currentCase.outputs?.backpressureCorrectionFactor ?? '-'}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card >

                        {/* Messages & Warnings */}
                        {(() => {
                            // Compute live percentUsed based on current numberOfValves
                            const livePercentUsed = (currentCase.outputs?.requiredArea ?? 0) / (numberOfValves * (currentCase.outputs?.orificeArea ?? 1)) * 100;

                            // Filter messages - remove "exceeds largest" warning if multi-valve makes it fit
                            const filteredMessages = (currentCase.outputs?.messages ?? []).filter(msg => {
                                if (msg.includes('WARNING: Required area exceeds largest standard orifice') && livePercentUsed <= 100) {
                                    return false;
                                }
                                return true;
                            });

                            if (filteredMessages.length === 0) return null;

                            return (
                                <Card sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                                            Notes & Warnings
                                        </Typography>
                                        <List dense disablePadding>
                                            {filteredMessages.map((msg, idx) => (
                                                <ListItem key={idx} disablePadding sx={{ py: 0.5 }}>
                                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                                        <Info sx={{ fontSize: 18, color: 'info.main' }} />
                                                    </ListItemIcon>
                                                    <ListItemText primary={msg} primaryTypographyProps={{ variant: 'body2' }} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </CardContent>
                                </Card>
                            );
                        })()}

                        {/* Status Alert */}
                        {(() => {
                            // Compute live percentUsed based on current numberOfValves
                            const livePercentUsed = (currentCase.outputs?.requiredArea ?? 0) / (numberOfValves * (currentCase.outputs?.orificeArea ?? 1)) * 100;
                            const isAdequatelySized = livePercentUsed <= 100;

                            return (
                                <Alert
                                    severity={isAdequatelySized ? 'success' : 'error'}
                                    sx={{ mb: 3 }}
                                >
                                    {isAdequatelySized
                                        ? `${numberOfValves > 1 ? `${numberOfValves} x ` : ''}Orifice ${currentCase.outputs?.selectedOrifice ?? '-'} is adequately sized with ${(100 - livePercentUsed).toFixed(1)}% margin.`
                                        : `${numberOfValves > 1 ? `${numberOfValves} x ` : ''}Orifice ${currentCase.outputs?.selectedOrifice ?? '-'} is undersized. Select a larger orifice.`
                                    }
                                </Alert>
                            );
                        })()}

                        {/* Hydraulic Calculations Report */}
                        {
                            (inletHydraulicResult?.segments?.length || outletHydraulicResult?.segments?.length) && (
                                <Box sx={{ mb: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography variant="subtitle1" fontWeight={600}>
                                            Hydraulic Calculations Report
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => setHydraulicReportDialogOpen(true)}
                                        >
                                            Open Full Report
                                        </Button>
                                    </Box>

                                    {inletHydraulicResult && inletHydraulicResult.segments.length > 0 && (
                                        <>
                                            {/* Inlet Warnings */}
                                            {inletHydraulicResult.segments.some(s => s.isErosional) && (
                                                <Alert severity="error" sx={{ mb: 1 }}>
                                                    <strong>Inlet - Erosional Velocity:</strong> {inletHydraulicResult.segments.filter(s => s.isErosional).map(s => `${s.name} (${s.velocity?.toFixed(1)} m/s)`).join(', ')}
                                                </Alert>
                                            )}
                                            {inletHydraulicResult.segments.some(s => (s.machNumber ?? 0) > 0.7) && (
                                                <Alert severity="error" sx={{ mb: 1 }}>
                                                    <strong>Inlet - High Mach (&gt;0.7):</strong> {inletHydraulicResult.segments.filter(s => (s.machNumber ?? 0) > 0.7).map(s => `${s.name} (${s.machNumber?.toFixed(3)})`).join(', ')}
                                                </Alert>
                                            )}
                                            {inletHydraulicResult.segments.some(s => (s.machNumber ?? 0) > 0.5 && (s.machNumber ?? 0) <= 0.7) && (
                                                <Alert severity="warning" sx={{ mb: 1 }}>
                                                    <strong>Inlet - Elevated Mach (&gt;0.5):</strong> {inletHydraulicResult.segments.filter(s => (s.machNumber ?? 0) > 0.5 && (s.machNumber ?? 0) <= 0.7).map(s => `${s.name} (${s.machNumber?.toFixed(3)})`).join(', ')}
                                                </Alert>
                                            )}
                                            <HydraulicReportTable
                                                title="Inlet Piping Network"
                                                segments={inletHydraulicResult.segments}
                                                totalPressureDropKPa={inletHydraulicResult.pressureDropKPa}
                                                hasChokedFlow={inletHydraulicResult.hasChokedFlow}
                                                warnings={inletHydraulicResult.warnings}
                                                defaultExpanded={inletHydraulicResult.hasChokedFlow}
                                            />
                                        </>
                                    )}

                                    {outletHydraulicResult && outletHydraulicResult.segments.length > 0 && (
                                        <>
                                            {/* Outlet Warnings */}
                                            {outletHydraulicResult.segments.some(s => s.isErosional) && (
                                                <Alert severity="error" sx={{ mb: 1 }}>
                                                    <strong>Outlet - Erosional Velocity:</strong> {outletHydraulicResult.segments.filter(s => s.isErosional).map(s => `${s.name} (${s.velocity?.toFixed(1)} m/s)`).join(', ')}
                                                </Alert>
                                            )}
                                            {outletHydraulicResult.segments.some(s => (s.machNumber ?? 0) > 0.7) && (
                                                <Alert severity="error" sx={{ mb: 1 }}>
                                                    <strong>Outlet - High Mach (&gt;0.7):</strong> {outletHydraulicResult.segments.filter(s => (s.machNumber ?? 0) > 0.7).map(s => `${s.name} (${s.machNumber?.toFixed(3)})`).join(', ')}
                                                </Alert>
                                            )}
                                            {outletHydraulicResult.segments.some(s => (s.machNumber ?? 0) > 0.5 && (s.machNumber ?? 0) <= 0.7) && (
                                                <Alert severity="warning" sx={{ mb: 1 }}>
                                                    <strong>Outlet - Elevated Mach (&gt;0.5):</strong> {outletHydraulicResult.segments.filter(s => (s.machNumber ?? 0) > 0.5 && (s.machNumber ?? 0) <= 0.7).map(s => `${s.name} (${s.machNumber?.toFixed(3)})`).join(', ')}
                                                </Alert>
                                            )}
                                            <HydraulicReportTable
                                                title="Outlet Piping Network"
                                                segments={outletHydraulicResult.segments}
                                                totalPressureDropKPa={outletHydraulicResult.pressureDropKPa}
                                                hasChokedFlow={outletHydraulicResult.hasChokedFlow}
                                                warnings={outletHydraulicResult.warnings}
                                                defaultExpanded={outletHydraulicResult.hasChokedFlow}
                                            />
                                        </>
                                    )}
                                </Box>
                            )
                        }

                        {/* Inlet Pressure Drop Validation Alert */}
                        {
                            currentCase.outputs?.inletValidation && (
                                <Alert
                                    severity={currentCase.outputs.inletValidation.severity}
                                    sx={{ mb: 3 }}
                                    icon={
                                        currentCase.outputs.inletValidation.isValid ?
                                            <CheckCircle /> :
                                            currentCase.outputs.inletValidation.severity === 'warning' ?
                                                <Warning /> :
                                                <ErrorIcon />
                                    }
                                >
                                    <strong>Inlet Pressure Drop Validation:</strong> {currentCase.outputs.inletValidation.message}
                                    {currentCase.outputs.inletPressureDropPercent !== undefined && (
                                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                                            Inlet ΔP: {currentCase.outputs.inletPressureDropPercent.toFixed(1)}% of set pressure
                                            {localInletNetwork && localInletNetwork.pipes && ` (${localInletNetwork.pipes.length} pipe${localInletNetwork.pipes.length !== 1 ? 's' : ''})`}
                                        </Typography>
                                    )}
                                </Alert>
                            )
                        }

                        {/* Combined Hydraulic Warnings */}
                        {
                            hydraulicWarnings.length > 0 && (
                                <Alert severity="warning" sx={{ mb: 3 }}>
                                    <strong>Hydraulic Calculation Warnings:</strong>
                                    <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                                        {hydraulicWarnings.map((warning, idx) => (
                                            <li key={idx}>{warning}</li>
                                        ))}
                                    </Box>
                                </Alert>
                            )
                        }

                        {/* Export Actions */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button variant="outlined" startIcon={<Download />}>
                                Export PDF Report
                            </Button>
                            <Button variant="outlined" startIcon={<Download />}>
                                Export to Excel
                            </Button>
                        </Box>
                    </Box >
                </TabPanel >
            </Box >



            {/* Delete Confirmation Dialog */}
            < Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)
            }>
                <DialogTitle>Delete Sizing Case?</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        This action cannot be undone. This will permanently delete the sizing case
                        <strong> {currentCase.scenarioId} </strong> (Rev {currentCase.revisionNo}) from <strong>{psvTag}</strong>.
                    </DialogContentText>
                    <Typography variant="body2" gutterBottom>
                        Please type <strong>delete sizing case</strong> to confirm.
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        fullWidth
                        variant="outlined"
                        value={deleteConfirmationInput}
                        onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                        placeholder="delete sizing case"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConfirmDelete}
                        disabled={deleteConfirmationInput !== "delete sizing case"}
                    >
                        Delete Sizing Case
                    </Button>
                </DialogActions>
            </Dialog >

            {/* Pipe Editor Dialog */}
            < PipeEditorDialog
                open={pipeEditorOpen}
                pipe={editingPipe}
                pipeType={editingPipeType}
                defaultPressure={editingPipeType === 'inlet'
                    ? psvSetPressure
                    : currentCase.inputs.destinationPressure ?? 0}
                accumulationPct={10}
                fluidPhase={
                    currentCase.method === 'gas' || currentCase.method === 'steam'
                        ? currentCase.method
                        : currentCase.method === 'two_phase'
                            ? 'two_phase'
                            : 'liquid'
                }
                onSave={handleSavePipe}
                onCancel={() => {
                    setPipeEditorOpen(false);
                    setEditingPipe(null);
                }}
            />

            {/* Hydraulic Report Dialog */}
            <HydraulicReportDialog
                open={hydraulicReportDialogOpen}
                onClose={() => setHydraulicReportDialogOpen(false)}
                inletSegments={inletHydraulicResult?.segments ?? []}
                outletSegments={outletHydraulicResult?.segments ?? []}
                inletTotalDropKPa={inletHydraulicResult?.pressureDropKPa ?? 0}
                outletTotalDropKPa={outletHydraulicResult?.pressureDropKPa ?? 0}
                inletHasChoked={inletHydraulicResult?.hasChokedFlow ?? false}
                outletHasChoked={outletHydraulicResult?.hasChokedFlow ?? false}
                caseName={`Sizing Case ${currentCase.scenarioId}`}
            />
        </Box >
    );
}

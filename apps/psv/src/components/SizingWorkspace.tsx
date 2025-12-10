"use client";

import { useState } from "react";
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
    LinearProgress,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Alert,
    useTheme,
} from "@mui/material";
import {
    ArrowBack,
    Info,
    CheckCircle,
    Warning,
    Download,
    Calculate,
} from "@mui/icons-material";
import { SizingCase, PipelineNetwork, PipeProps, ORIFICE_SIZES, SizingInputs } from "@/data/types";
import { PipelineDataGrid } from "./PipelineDataGrid";
import { v4 as uuidv4 } from "uuid";
import { calculateSizing } from "@/lib/psvSizing";

interface SizingWorkspaceProps {
    sizingCase: SizingCase;
    inletNetwork?: PipelineNetwork;
    outletNetwork?: PipelineNetwork;
    onClose: () => void;
    onSave: (updatedCase: SizingCase) => void;
    onSaveNetworks?: (inlet: PipelineNetwork | undefined, outlet: PipelineNetwork | undefined) => void;
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
const PRESSURE_UNITS = ['barg', 'bara', 'psig', 'psia', 'kPa'];
const TEMPERATURE_UNITS = ['°C', '°F', 'K'];
const FLOW_UNITS = ['kg/h', 'lb/h', 'kg/s'];
const VISCOSITY_UNITS = ['cP', 'mPa·s', 'Pa·s'];
const DENSITY_UNITS = ['kg/m³', 'lb/ft³'];

export function SizingWorkspace({ sizingCase, inletNetwork, outletNetwork, onClose, onSave, onSaveNetworks }: SizingWorkspaceProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [activeTab, setActiveTab] = useState(0);
    const [currentCase, setCurrentCase] = useState<SizingCase>(sizingCase);
    const [manualOrificeMode, setManualOrificeMode] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);

    // Button state tracking
    // Always start fresh - user must calculate in this session
    const [isDirty, setIsDirty] = useState(false);
    const [isCalculated, setIsCalculated] = useState(false);

    // Multiple valve support
    const [numberOfValves, setNumberOfValves] = useState(sizingCase.outputs.numberOfValves || 1);

    // Local network state (from PSV, not sizing case)
    const [localInletNetwork, setLocalInletNetwork] = useState<PipelineNetwork | undefined>(inletNetwork);
    const [localOutletNetwork, setLocalOutletNetwork] = useState<PipelineNetwork | undefined>(outletNetwork);

    // Unit state
    const [units, setUnits] = useState({
        pressure: 'barg',
        temperature: '°C',
        flow: 'kg/h',
        viscosity: 'cP',
        density: 'kg/m³',
    });

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    // Handle input changes for SizingInputs
    const handleInputChange = (field: keyof SizingInputs, value: number | string) => {
        // Handle NaN from parseFloat on empty input
        const safeValue = typeof value === 'number' && isNaN(value) ? 0 : value;
        setCurrentCase({
            ...currentCase,
            inputs: {
                ...currentCase.inputs,
                [field]: safeValue,
            },
        });
        // Mark as dirty and needs recalculation
        setIsDirty(true);
        setIsCalculated(false);
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
    };

    const handleEditPipe = (id: string, type: 'inlet' | 'outlet') => {
        console.log(`Edit ${type} pipe`, id);
        // TODO: Open detailed pipe editor dialog
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
    };

    // Calculate using API-520/521 equations
    const handleCalculate = async () => {
        setIsCalculating(true);

        // Small delay for UI feedback
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            // Run API-520/521 calculation
            const outputs = calculateSizing(currentCase.inputs, currentCase.method);

            setCurrentCase({
                ...currentCase,
                outputs,
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
        onSaveNetworks?.(localInletNetwork, localOutletNetwork);
        onSave(caseToSave);
        onClose();
    };

    const isLiquidOrTwoPhase = currentCase.method === 'liquid' || currentCase.method === 'two_phase';

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
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
                        Cancel
                    </Button>
                    {isCalculated && !isDirty ? (
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
                    )}
                </Box>
            </Paper>

            {isCalculating && <LinearProgress />}

            {/* Tabs */}
            <Paper square sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={handleTabChange}>
                    <Tab label="Conditions" />
                    <Tab label="Inlet Piping" />
                    <Tab label="PSV Sizing" />
                    <Tab label="Outlet Piping" />
                    <Tab label="Results" />
                </Tabs>
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
                                        value={currentCase.inputs.massFlowRate}
                                        onChange={(e) => handleInputChange('massFlowRate', parseFloat(e.target.value))}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <TextField
                                                        select
                                                        variant="standard"
                                                        value={units.flow}
                                                        onChange={(e) => setUnits({ ...units, flow: e.target.value })}
                                                        sx={{ minWidth: 60 }}
                                                    >
                                                        {FLOW_UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                                                    </TextField>
                                                </InputAdornment>
                                            ),
                                        }}
                                        fullWidth
                                    />
                                    <TextField
                                        label="Sizing Method"
                                        select
                                        value={currentCase.method}
                                        onChange={(e) => setCurrentCase({ ...currentCase, method: e.target.value as SizingCase['method'] })}
                                        fullWidth
                                    >
                                        <MenuItem value="gas">Gas / Vapor</MenuItem>
                                        <MenuItem value="liquid">Liquid</MenuItem>
                                        <MenuItem value="steam">Steam</MenuItem>
                                        <MenuItem value="two_phase">Two-Phase</MenuItem>
                                    </TextField>
                                </Box>
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
                                        value={currentCase.inputs.pressure}
                                        onChange={(e) => handleInputChange('pressure', parseFloat(e.target.value))}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <TextField
                                                        select
                                                        variant="standard"
                                                        value={units.pressure}
                                                        onChange={(e) => setUnits({ ...units, pressure: e.target.value })}
                                                        sx={{ minWidth: 60 }}
                                                    >
                                                        {PRESSURE_UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                                                    </TextField>
                                                </InputAdornment>
                                            ),
                                        }}
                                        fullWidth
                                    />
                                    <TextField
                                        label="Relieving Temperature"
                                        type="number"
                                        value={currentCase.inputs.temperature}
                                        onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <TextField
                                                        select
                                                        variant="standard"
                                                        value={units.temperature}
                                                        onChange={(e) => setUnits({ ...units, temperature: e.target.value })}
                                                        sx={{ minWidth: 50 }}
                                                    >
                                                        {TEMPERATURE_UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                                                    </TextField>
                                                </InputAdornment>
                                            ),
                                        }}
                                        fullWidth
                                    />
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Fluid Properties */}
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                                    Fluid Properties
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                                    <TextField
                                        label="Molecular Weight"
                                        type="number"
                                        value={currentCase.inputs.molecularWeight}
                                        onChange={(e) => handleInputChange('molecularWeight', parseFloat(e.target.value))}
                                        InputProps={{ endAdornment: <InputAdornment position="end">g/mol</InputAdornment> }}
                                        fullWidth
                                    />
                                    <TextField
                                        label="Compressibility (Z)"
                                        type="number"
                                        value={currentCase.inputs.compressibilityZ}
                                        onChange={(e) => handleInputChange('compressibilityZ', parseFloat(e.target.value))}
                                        inputProps={{ step: 0.01, min: 0, max: 2 }}
                                        fullWidth
                                    />
                                    <TextField
                                        label="Specific Heat Ratio (k)"
                                        type="number"
                                        value={currentCase.inputs.specificHeatRatio}
                                        onChange={(e) => handleInputChange('specificHeatRatio', parseFloat(e.target.value))}
                                        inputProps={{ step: 0.01, min: 1, max: 2 }}
                                        fullWidth
                                    />
                                </Box>

                                {/* Conditional fields for liquid/two-phase */}
                                {isLiquidOrTwoPhase && (
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
                                        <TextField
                                            label="Viscosity"
                                            type="number"
                                            value={currentCase.inputs.viscosity || ''}
                                            onChange={(e) => handleInputChange('viscosity', parseFloat(e.target.value))}
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <TextField
                                                            select
                                                            variant="standard"
                                                            value={units.viscosity}
                                                            onChange={(e) => setUnits({ ...units, viscosity: e.target.value })}
                                                            sx={{ minWidth: 60 }}
                                                        >
                                                            {VISCOSITY_UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                                                        </TextField>
                                                    </InputAdornment>
                                                ),
                                            }}
                                            fullWidth
                                        />
                                        <TextField
                                            label="Density"
                                            type="number"
                                            value={currentCase.inputs.density || ''}
                                            onChange={(e) => handleInputChange('density', parseFloat(e.target.value))}
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <TextField
                                                            select
                                                            variant="standard"
                                                            value={units.density}
                                                            onChange={(e) => setUnits({ ...units, density: e.target.value })}
                                                            sx={{ minWidth: 70 }}
                                                        >
                                                            {DENSITY_UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                                                        </TextField>
                                                    </InputAdornment>
                                                ),
                                            }}
                                            fullWidth
                                        />
                                    </Box>
                                )}
                            </CardContent>
                        </Card>

                        {/* Backpressure */}
                        <Card>
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                                    Backpressure
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                                    <TextField
                                        label="Backpressure"
                                        type="number"
                                        value={currentCase.inputs.backpressure}
                                        onChange={(e) => handleInputChange('backpressure', parseFloat(e.target.value))}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <TextField
                                                        select
                                                        variant="standard"
                                                        value={units.pressure}
                                                        onChange={(e) => setUnits({ ...units, pressure: e.target.value })}
                                                        sx={{ minWidth: 60 }}
                                                    >
                                                        {PRESSURE_UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                                                    </TextField>
                                                </InputAdornment>
                                            ),
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
                            </CardContent>
                        </Card>
                    </Box>
                </TabPanel>

                {/* ==================== TAB 1: INLET PIPING ==================== */}
                <TabPanel value={activeTab} index={1}>
                    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Inlet Pipeline Configuration</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Define the pipe segments from the protected equipment to the PSV inlet.
                        </Typography>

                        <PipelineDataGrid
                            pipes={localInletNetwork?.pipes || []}
                            onAddPipe={handleAddInletPipe}
                            onEditPipe={(id) => handleEditPipe(id, 'inlet')}
                            onDeletePipe={(id) => handleDeletePipe(id, 'inlet')}
                        />
                    </Box>
                </TabPanel>

                {/* ==================== TAB 2: PSV SIZING ==================== */}
                <TabPanel value={activeTab} index={2}>
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
                                        onChange={(e) => setCurrentCase({ ...currentCase, standard: e.target.value as SizingCase['standard'] })}
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
                                        value={currentCase.outputs.dischargeCoefficient}
                                        InputProps={{ readOnly: true }}
                                        fullWidth
                                        helperText="Per API-520 (0.975 for gas, 0.65 for liquid)"
                                    />
                                    <TextField
                                        label="Backpressure Correction (Kb)"
                                        type="number"
                                        value={currentCase.outputs.backpressureCorrectionFactor}
                                        InputProps={{ readOnly: true }}
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
                                            {Math.round(currentCase.outputs.requiredArea / numberOfValves).toLocaleString()} mm²
                                        </Typography>
                                        {numberOfValves > 1 && (
                                            <Typography variant="caption" color="text.secondary">
                                                Total: {currentCase.outputs.requiredArea.toLocaleString()} mm²
                                            </Typography>
                                        )}
                                    </Box>
                                    <TextField
                                        label="Selected Orifice"
                                        select
                                        value={manualOrificeMode ? currentCase.outputs.selectedOrifice : getAutoSelectedOrifice().designation}
                                        onChange={(e) => handleOrificeChange(e.target.value)}
                                        disabled={!manualOrificeMode}
                                        fullWidth
                                    >
                                        {ORIFICE_SIZES.map(o => (
                                            <MenuItem
                                                key={o.designation}
                                                value={o.designation}
                                                disabled={o.area < (currentCase.outputs.requiredArea / numberOfValves)}
                                            >
                                                {o.designation} — {o.area.toLocaleString()} mm²
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Orifice Area</Typography>
                                        <Typography variant="h5" fontWeight={600}>
                                            {(manualOrificeMode ? currentCase.outputs.orificeArea : getAutoSelectedOrifice().area).toLocaleString()} mm²
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Utilization Bar */}
                                {(() => {
                                    const areaPerValve = currentCase.outputs.requiredArea / numberOfValves;
                                    const selectedOrifice = manualOrificeMode ? currentCase.outputs.orificeArea : getAutoSelectedOrifice().area;
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
                                        icon={currentCase.outputs.isCriticalFlow ? <CheckCircle /> : <Info />}
                                        label={currentCase.outputs.isCriticalFlow ? 'Critical Flow' : 'Subcritical Flow'}
                                        color={currentCase.outputs.isCriticalFlow ? 'success' : 'info'}
                                    />
                                    {currentCase.outputs.percentUsed > 90 && (
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

                        <PipelineDataGrid
                            pipes={localOutletNetwork?.pipes || []}
                            onAddPipe={handleAddOutletPipe}
                            onEditPipe={(id) => handleEditPipe(id, 'outlet')}
                            onDeletePipe={(id) => handleDeletePipe(id, 'outlet')}
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
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3 }}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Selected Orifice</Typography>
                                        <Typography variant="h3" fontWeight={700} color="primary.main">
                                            {currentCase.outputs.selectedOrifice}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Orifice Area</Typography>
                                        <Typography variant="h5" fontWeight={600}>
                                            {currentCase.outputs.orificeArea.toLocaleString()} mm²
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">% Used</Typography>
                                        <Typography variant="h5" fontWeight={600} color={currentCase.outputs.percentUsed > 90 ? 'warning.main' : 'text.primary'}>
                                            {currentCase.outputs.percentUsed.toFixed(1)}%
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Rated Capacity</Typography>
                                        <Typography variant="h5" fontWeight={600}>
                                            {currentCase.outputs.ratedCapacity.toLocaleString()} kg/h
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Flow Analysis */}
                        <Card sx={{ mb: 3 }}>
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
                                            {currentCase.outputs.dischargeCoefficient}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">BP Correction Factor</Typography>
                                        <Typography variant="h6" fontWeight={600}>
                                            {currentCase.outputs.backpressureCorrectionFactor}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Messages & Warnings */}
                        {currentCase.outputs.messages.length > 0 && (
                            <Card sx={{ mb: 3 }}>
                                <CardContent>
                                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                                        Notes & Warnings
                                    </Typography>
                                    <List dense disablePadding>
                                        {currentCase.outputs.messages.map((msg, idx) => (
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
                        )}

                        {/* Status Alert */}
                        <Alert
                            severity={currentCase.outputs.percentUsed <= 100 ? 'success' : 'error'}
                            sx={{ mb: 3 }}
                        >
                            {currentCase.outputs.percentUsed <= 100
                                ? `Orifice ${currentCase.outputs.selectedOrifice} is adequately sized with ${(100 - currentCase.outputs.percentUsed).toFixed(1)}% margin.`
                                : `Orifice ${currentCase.outputs.selectedOrifice} is undersized. Select a larger orifice.`
                            }
                        </Alert>

                        {/* Export Actions */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button variant="outlined" startIcon={<Download />}>
                                Export PDF Report
                            </Button>
                            <Button variant="outlined" startIcon={<Download />}>
                                Export to Excel
                            </Button>
                        </Box>
                    </Box>
                </TabPanel>
            </Box>
        </Box>
    );
}

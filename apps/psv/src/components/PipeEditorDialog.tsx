"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Box,
    Typography,
    Divider,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    InputAdornment,
    Chip,
} from "@mui/material";
import { Delete, Add } from "@mui/icons-material";
import { UnitSelector } from "@/components/shared";
import { NumericInput } from "@/components/shared/NumericInput";
import { PipeProps } from "@/data/types";
import type { FittingType } from "@eng-suite/physics";
import {
    PIPE_SCHEDULES,
    getInnerDiameterMm,
    getAvailableNpsSizes,
    type PipeSchedule,
} from "@eng-suite/physics";

// Extended PipeProps with NPS/Schedule fields (used in network-editor)
interface ExtendedPipeProps extends PipeProps {
    diameterInputMode?: "nps" | "diameter";
    pipeNPD?: number;
    pipeSchedule?: string;
    lineNumber?: string;
    isometricNumber?: string;
}

// Fitting type options
const FITTING_OPTIONS = [
    { value: "elbow_90", label: "Elbow 90°" },
    { value: "elbow_45", label: "Elbow 45°" },
    { value: "tee_through", label: "Tee Through" },
    { value: "tee_elbow", label: "Tee Branch" },
    { value: "block_valve_full_line_size", label: "Gate Valve" },
    { value: "globe_valve", label: "Globe Valve" },
    { value: "check_valve_swing", label: "Check Valve" },
    { value: "pipe_entrance_normal", label: "Pipe Entry" },
    { value: "pipe_exit", label: "Pipe Exit" },
];

interface PipeEditorDialogProps {
    open: boolean;
    pipe: PipeProps | null;
    pipeType: 'inlet' | 'outlet';
    defaultPressure?: number; // Relieving pressure for inlet, destination for outlet
    accumulationPct?: number; // For inlet preset
    fluidPhase?: 'gas' | 'liquid' | 'steam' | 'two_phase';
    onSave: (pipe: PipeProps) => void;
    onCancel: () => void;
}

export function PipeEditorDialog({
    open,
    pipe,
    pipeType,
    defaultPressure = 0,
    accumulationPct = 10,
    fluidPhase = 'gas',
    onSave,
    onCancel,
}: PipeEditorDialogProps) {
    // Cast to extended type for NPS fields
    const extendedPipe = pipe as ExtendedPipeProps | null;

    // Form state
    const [name, setName] = useState("");
    const [lineNumber, setLineNumber] = useState("");
    const [isometricNumber, setIsometricNumber] = useState("");
    const [direction, setDirection] = useState<"forward" | "backward">("forward");
    const [boundaryPressure, setBoundaryPressure] = useState<number>(0);
    const [boundaryPressureUnit, setBoundaryPressureUnit] = useState("barg");
    const [gasFlowModel, setGasFlowModel] = useState<"adiabatic" | "isothermal">("adiabatic");

    // Diameter
    const [diameterInputMode, setDiameterInputMode] = useState<"nps" | "diameter">("nps");
    const [nps, setNps] = useState<number>(4);
    const [schedule, setSchedule] = useState<string>("40");
    const [diameter, setDiameter] = useState<number>(100);
    const [diameterUnit, setDiameterUnit] = useState("mm");

    // Physical
    const [length, setLength] = useState<number>(10);
    const [lengthUnit, setLengthUnit] = useState("m");
    const [elevation, setElevation] = useState<number>(0);
    const [elevationUnit, setElevationUnit] = useState("m");
    const [roughness, setRoughness] = useState<number>(0.0457);
    const [roughnessUnit, setRoughnessUnit] = useState("mm");

    // Additional
    const [kSafetyFactor, setKSafetyFactor] = useState<number>(0);
    const [userSpecifiedLoss, setUserSpecifiedLoss] = useState<number>(0);
    const [userSpecifiedLossUnit, setUserSpecifiedLossUnit] = useState("kPa");

    // Fittings
    const [fittingType, setFittingType] = useState<"LR" | "SR" | "SRCD">("LR");
    const [fittings, setFittings] = useState<FittingType[]>([]);
    const [newFittingType, setNewFittingType] = useState("elbow_90");
    const [newFittingCount, setNewFittingCount] = useState(1);

    const availableFittingOptions = useMemo(
        () => FITTING_OPTIONS.filter(option => !fittings.some(f => f.type === option.value)),
        [fittings],
    );

    useEffect(() => {
        if (!availableFittingOptions.length) {
            setNewFittingType("");
            return;
        }
        if (!availableFittingOptions.some(opt => opt.value === newFittingType)) {
            setNewFittingType(availableFittingOptions[0].value);
        }
    }, [availableFittingOptions, newFittingType]);

    // Initialize form when pipe changes
    useEffect(() => {
        if (extendedPipe) {
            setName(extendedPipe.name || "");
            setLineNumber(extendedPipe.lineNumber || "");
            setIsometricNumber(extendedPipe.isometricNumber || "");
            setDirection(extendedPipe.direction || (pipeType === 'inlet' ? 'forward' : 'backward'));
            setBoundaryPressure(extendedPipe.boundaryPressure ?? getDefaultPressure());
            setBoundaryPressureUnit(extendedPipe.boundaryPressureUnit || "barg");
            setGasFlowModel(extendedPipe.gasFlowModel || "adiabatic");

            setDiameterInputMode(extendedPipe.diameterInputMode || "diameter");
            setNps(extendedPipe.pipeNPD || 4);
            setSchedule(extendedPipe.pipeSchedule || "40");
            setDiameter(extendedPipe.diameter || 100);
            setDiameterUnit(extendedPipe.diameterUnit || "mm");

            setLength(extendedPipe.length || 10);
            setLengthUnit(extendedPipe.lengthUnit || "m");
            setElevation(extendedPipe.elevation || 0);
            setElevationUnit(extendedPipe.elevationUnit || "m");
            setRoughness(extendedPipe.roughness || 0.0457);
            setRoughnessUnit(extendedPipe.roughnessUnit || "mm");

            setKSafetyFactor(extendedPipe.pipingFittingSafetyFactor || 0);
            setUserSpecifiedLoss(extendedPipe.userSpecifiedPressureLoss || 0);
            setUserSpecifiedLossUnit(extendedPipe.userSpecifiedPressureLossUnit || "kPa");

            setFittingType((extendedPipe.fittingType as "LR" | "SR" | "SRCD") || "LR");
            setFittings(extendedPipe.fittings || []);
        } else {
            // Reset to defaults for new pipe
            resetForm();
        }
    }, [pipe, open]);

    const getDefaultPressure = () => {
        if (pipeType === 'inlet') {
            // Relieving pressure = Set pressure * (1 + accumulation%)
            return defaultPressure * (1 + accumulationPct / 100);
        }
        return defaultPressure; // Destination pressure for outlet
    };

    const resetForm = () => {
        setName("");
        setLineNumber("");
        setIsometricNumber("");
        setDirection(pipeType === 'inlet' ? 'forward' : 'backward');
        setBoundaryPressure(getDefaultPressure());
        setBoundaryPressureUnit("barg");
        setGasFlowModel("adiabatic");
        setDiameterInputMode("diameter");
        setNps(4);
        setSchedule("40");
        setDiameter(100);
        setDiameterUnit("mm");
        setLength(10);
        setLengthUnit("m");
        setElevation(0);
        setElevationUnit("m");
        setRoughness(0.0457);
        setRoughnessUnit("mm");
        setKSafetyFactor(0);
        setUserSpecifiedLoss(0);
        setUserSpecifiedLossUnit("kPa");
        setFittingType("LR");
        setFittings([]);
    };

    const handleNpsChange = (newNps: number) => {
        setNps(newNps);
        const id = getInnerDiameterMm(newNps, schedule);
        if (id !== undefined) {
            setDiameter(id);
            setDiameterUnit("mm");
        }
    };

    const handleAddFitting = () => {
        if (!newFittingType) return;
        const newFitting: FittingType = {
            type: newFittingType,
            count: newFittingCount,
            k_each: 0, // Will be calculated by physics engine
            k_total: 0,
        };
        setFittings([...fittings, newFitting]);
        setNewFittingCount(1);
    };

    const handleRemoveFitting = (index: number) => {
        setFittings(fittings.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (!pipe) return;

        const computedNpsDiameter = getInnerDiameterMm(nps, schedule);
        const effectiveDiameter =
            diameterInputMode === 'diameter'
                ? diameter
                : computedNpsDiameter ?? diameter;

        // Use type assertion for extended properties
        const updatedPipe = {
            ...pipe,
            name,
            lineNumber: lineNumber.trim() || undefined,
            isometricNumber: isometricNumber.trim() || undefined,
            direction,
            boundaryPressure,
            boundaryPressureUnit,
            gasFlowModel,
            diameterInputMode,
            pipeNPD: nps,
            pipeSchedule: schedule,
            diameter: effectiveDiameter,
            diameterUnit: diameterInputMode === 'diameter' ? diameterUnit : "mm",
            length,
            lengthUnit,
            elevation,
            elevationUnit,
            roughness,
            roughnessUnit,
            pipingFittingSafetyFactor: kSafetyFactor,
            userSpecifiedPressureLoss: userSpecifiedLoss,
            userSpecifiedPressureLossUnit: userSpecifiedLossUnit,
            fittingType,
            fittings,
        } as PipeProps;

        onSave(updatedPipe);
    };

    const isGasPhase = fluidPhase === 'gas' || fluidPhase === 'steam' || fluidPhase === 'two_phase';
    const pressureLabel = direction === 'forward' ? 'Inlet Pressure' : 'Outlet Pressure';
    const npsSizes = useMemo(
        () => getAvailableNpsSizes(schedule),
        [schedule]
    );
    const npsCalculatedDiameterMm = useMemo(
        () => getInnerDiameterMm(nps, schedule),
        [nps, schedule]
    );

    return (
        <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
            <DialogTitle>
                Edit Pipe Segment
                <Typography variant="body2" color="text.secondary">
                    {pipeType === 'inlet' ? 'Inlet' : 'Outlet'} Pipeline
                </Typography>
            </DialogTitle>
            <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Basic Properties */}
                <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                        Basic Properties
                    </Typography>
                    <TextField
                        label="Segment Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        size="small"
                    />
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                            gap: 2,
                            mt: 2,
                        }}
                    >
                        <TextField
                            label="Line Number"
                            value={lineNumber}
                            onChange={(e) => setLineNumber(e.target.value)}
                            fullWidth
                            size="small"
                            helperText="P&ID line number"
                        />
                        <TextField
                            label="Isometric Number"
                            value={isometricNumber}
                            onChange={(e) => setIsometricNumber(e.target.value)}
                            fullWidth
                            size="small"
                            helperText="Isometric reference"
                        />
                    </Box>
                </Box>

                <Divider />

                {/* Configuration */}
                <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                        Configuration
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormControl size="small">
                            <FormLabel>Direction</FormLabel>
                            <RadioGroup
                                row
                                value={direction}
                                onChange={(e) => setDirection(e.target.value as "forward" | "backward")}
                            >
                                <FormControlLabel value="forward" control={<Radio size="small" />} label="Forward" />
                                <FormControlLabel value="backward" control={<Radio size="small" />} label="Backward" />
                            </RadioGroup>
                        </FormControl>

                        <UnitSelector
                            label={pressureLabel}
                            value={boundaryPressure}
                            unit={boundaryPressureUnit}
                            availableUnits={['barg', 'bara', 'kPag', 'psig']}
                            onChange={(val, unit) => {
                                setBoundaryPressure(val || 0);
                                setBoundaryPressureUnit(unit);
                            }}
                        />

                        {isGasPhase && (
                            <FormControl size="small">
                                <FormLabel>Gas Flow Model</FormLabel>
                                <RadioGroup
                                    row
                                    value={gasFlowModel}
                                    onChange={(e) => setGasFlowModel(e.target.value as "adiabatic" | "isothermal")}
                                >
                                    <FormControlLabel value="adiabatic" control={<Radio size="small" />} label="Adiabatic" />
                                    <FormControlLabel value="isothermal" control={<Radio size="small" />} label="Isothermal" />
                                </RadioGroup>
                            </FormControl>
                        )}
                    </Box>
                </Box>

                <Divider />

                {/* Dimensions */}
                <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                        Dimensions
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Diameter Mode */}
                        <FormControl size="small">
                            <FormLabel>Diameter Input</FormLabel>
                            <RadioGroup
                                row
                                value={diameterInputMode}
                                onChange={(e) => {
                                    const mode = e.target.value as "nps" | "diameter";
                                    setDiameterInputMode(mode);
                                    if (mode === "nps") {
                                        const id = getInnerDiameterMm(nps, schedule);
                                        if (id !== undefined) {
                                            setDiameter(id);
                                            setDiameterUnit("mm");
                                        }
                                    }
                                }}
                            >
                                <FormControlLabel value="nps" control={<Radio size="small" />} label="NPS + Schedule" />
                                <FormControlLabel value="diameter" control={<Radio size="small" />} label="Direct Input" />
                            </RadioGroup>
                        </FormControl>

                        {diameterInputMode === 'nps' ? (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                    select
                                    label="NPS"
                                    value={nps}
                                    onChange={(e) => handleNpsChange(parseFloat(e.target.value))}
                                    size="small"
                                    sx={{ flex: 1 }}
                                    helperText={
                                        npsCalculatedDiameterMm !== undefined
                                            ? `Calculated ID: ${npsCalculatedDiameterMm.toFixed(2)} mm`
                                            : 'Calculated ID unavailable'
                                    }
                                >
                                    {npsSizes.map((size: number) => (
                                        <MenuItem key={size} value={size}>{size}"</MenuItem>
                                    ))}
                                </TextField>
                                <TextField
                                    select
                                    label="Schedule"
                                    value={schedule}
                                    onChange={(e) => {
                                        const next = e.target.value;
                                        setSchedule(next);
                                        const id = getInnerDiameterMm(nps, next);
                                        if (id !== undefined) {
                                            setDiameter(id);
                                            setDiameterUnit("mm");
                                        }
                                    }}
                                    size="small"
                                    sx={{ flex: 1 }}
                                >
                                    {PIPE_SCHEDULES.map(sch => (
                                        <MenuItem key={sch} value={sch}>{sch}</MenuItem>
                                    ))}
                                </TextField>
                            </Box>
                        ) : (
                            <UnitSelector
                                label="Diameter"
                                value={diameter}
                                unit={diameterUnit}
                                availableUnits={['mm', 'in']}
                                onChange={(val, unit) => {
                                    setDiameter(val || 0);
                                    setDiameterUnit(unit);
                                }}
                            />
                        )}

                        {/* Length */}
                        <UnitSelector
                            label="Length"
                            value={length}
                            unit={lengthUnit}
                            availableUnits={['m', 'ft']}
                            onChange={(val, unit) => {
                                setLength(val || 0);
                                setLengthUnit(unit);
                            }}
                        />

                        {/* Elevation */}
                        <UnitSelector
                            label="Elevation Change"
                            value={elevation}
                            unit={elevationUnit}
                            availableUnits={['m', 'ft']}
                            onChange={(val, unit) => {
                                setElevation(val || 0);
                                setElevationUnit(unit);
                            }}
                        />

                        {/* Roughness */}
                        <UnitSelector
                            label="Roughness"
                            value={roughness}
                            unit={roughnessUnit}
                            availableUnits={['mm', 'μm']}
                            onChange={(val, unit) => {
                                setRoughness(val || 0);
                                setRoughnessUnit(unit);
                            }}
                        />

                        {/* K-Safety Factor */}
                        <NumericInput
                            label="K-Safety Factor"
                            value={kSafetyFactor}
                            onChange={(val) => setKSafetyFactor(val || 0)}
                            size="small"
                            endAdornment="%"
                        />

                        {/* User Specified Loss */}
                        <UnitSelector
                            label="User Specified Loss"
                            value={userSpecifiedLoss}
                            unit={userSpecifiedLossUnit}
                            availableUnits={['kPa', 'bar', 'psi']}
                            onChange={(val, unit) => {
                                setUserSpecifiedLoss(val || 0);
                                setUserSpecifiedLossUnit(unit);
                            }}
                        />
                    </Box>
                </Box>

                <Divider />

                {/* Fittings */}
                <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                        Fittings
                    </Typography>

                    {/* Fitting Type */}
                    <FormControl size="small" sx={{ mb: 2 }}>
                        <FormLabel>Fitting Type (Elbow Radius)</FormLabel>
                        <RadioGroup
                            row
                            value={fittingType}
                            onChange={(e) => setFittingType(e.target.value as "LR" | "SR" | "SRCD")}
                        >
                            <FormControlLabel value="LR" control={<Radio size="small" />} label="LR" />
                            <FormControlLabel value="SR" control={<Radio size="small" />} label="SR" />
                            <FormControlLabel value="SRCD" control={<Radio size="small" />} label="SRCD" />
                        </RadioGroup>
                    </FormControl>

                    {/* Add Fitting */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <TextField
                            select
                            label="Fitting"
                            value={newFittingType}
                            onChange={(e) => setNewFittingType(e.target.value)}
                            size="small"
                            sx={{ flex: 1 }}
                            disabled={!availableFittingOptions.length}
                        >
                            {availableFittingOptions.length ? (
                                availableFittingOptions.map(opt => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))
                            ) : (
                                <MenuItem value="" disabled>
                                    All fittings added
                                </MenuItem>
                            )}
                        </TextField>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                                overflow: 'hidden',
                                height: 40,
                            }}
                        >
                            <IconButton
                                size="small"
                                onClick={() => setNewFittingCount(Math.max(1, newFittingCount - 1))}
                                disabled={newFittingCount <= 1}
                                sx={{ borderRadius: 0, px: 1.5 }}
                            >
                                <Typography variant="body1" fontWeight={500}>−</Typography>
                            </IconButton>
                            <TextField
                                value={newFittingCount}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val) && val >= 1) {
                                        setNewFittingCount(val);
                                    }
                                }}
                                size="small"
                                slotProps={{
                                    input: {
                                        sx: {
                                            textAlign: 'center',
                                            width: 48,
                                            '& input': { textAlign: 'center', p: 0 },
                                            '& fieldset': { border: 'none' },
                                        },
                                    },
                                }}
                            />
                            <IconButton
                                size="small"
                                onClick={() => setNewFittingCount(newFittingCount + 1)}
                                sx={{ borderRadius: 0, px: 1.5 }}
                            >
                                <Typography variant="body1" fontWeight={500}>+</Typography>
                            </IconButton>
                        </Box>
                        <Button
                            variant="outlined"
                            onClick={handleAddFitting}
                            startIcon={<Add />}
                            disabled={!newFittingType}
                        >
                            Add
                        </Button>
                    </Box>

                    {/* Fitting List */}
                    {fittings.length > 0 ? (
                        <List dense disablePadding>
                            {fittings.map((fitting, index) => (
                                <ListItem key={index} sx={{ px: 0 }}>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Chip label={fitting.count} size="small" />
                                                <Typography variant="body2">
                                                    {FITTING_OPTIONS.find(o => o.value === fitting.type)?.label || fitting.type}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton edge="end" size="small" onClick={() => handleRemoveFitting(index)}>
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                            No fittings added
                        </Typography>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Cancel</Button>
                <Button variant="contained" onClick={handleSave}>Save</Button>
            </DialogActions>
        </Dialog>
    );
}

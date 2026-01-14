"use client";

import { useState } from "react";
import {
    Box,
    Paper,
    Typography,
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    MenuItem,
    InputAdornment,
    LinearProgress,
    ToggleButtonGroup,
    ToggleButton,
} from "@mui/material";
import { Edit, Settings as SettingsIcon } from "@mui/icons-material";
import { ProtectiveSystem, FluidPhase, ValveOperatingType, UnitSystem } from "@/data/types";
import { usePsvStore } from "../store/usePsvStore";
import { glassCardStyles } from "./styles";
import { NumericInput } from "./shared/NumericInput";
import { useAuthStore } from "@/store/useAuthStore";
import { formatPressureGauge } from "@/lib/projectUnits";
import { UnitSelector } from "./shared/UnitSelector";
import { useUnitConversion } from "@/hooks/useUnitConversion";
import { getDefaultUnitPreferences } from "@/lib/unitPreferences";

interface OperatingConditionsCardProps {
    psv: ProtectiveSystem;
}

const PHASE_OPTIONS: { value: FluidPhase; label: string }[] = [
    { value: 'gas', label: 'Gas / Vapor' },
    { value: 'liquid', label: 'Liquid' },
    { value: 'steam', label: 'Steam' },
    { value: 'two_phase', label: 'Two-Phase' },
];

const VALVE_TYPE_OPTIONS: { value: ValveOperatingType; label: string; short: string }[] = [
    { value: 'conventional', label: 'Conventional', short: 'Conv.' },
    { value: 'balanced_bellows', label: 'Balanced Bellows', short: 'Bal. Bellows' },
    { value: 'pilot_operated', label: 'Pilot Operated', short: 'Pilot' },
];

export function OperatingConditionsCard({ psv }: OperatingConditionsCardProps) {
    const { updatePsv, selectedProject } = usePsvStore();
    const isParentInactive = !psv.isActive || selectedProject?.isActive === false;
    const canEdit = useAuthStore((state) => state.canEdit()) && !isParentInactive;
    const [open, setOpen] = useState(false);
    const unitSystem: UnitSystem = selectedProject?.unitSystem || 'metric';
    const [formData, setFormData] = useState({
        serviceFluid: psv.serviceFluid || '',
        fluidPhase: psv.fluidPhase || 'gas',
        setPressure: psv.setPressure || 0,
        mawp: psv.mawp || 0,
        valveType: psv.valveType || 'conventional',
    });

    // Unit conversion hook
    const defaultPreferences = getDefaultUnitPreferences(unitSystem);
    const { preferences, setUnit, toDisplay, toBase } = useUnitConversion(defaultPreferences);

    const PRESSURE_UNITS = ['barg', 'psig', 'kPag', 'kg/cm2g'];

    const handleEdit = () => {
        setFormData({
            serviceFluid: psv.serviceFluid || '',
            fluidPhase: psv.fluidPhase || 'gas',
            setPressure: psv.setPressure || 0,
            mawp: psv.mawp || 0,
            valveType: psv.valveType || 'conventional',
        });
        setOpen(true);
    };

    const handleSave = () => {
        updatePsv({
            ...psv,
            serviceFluid: formData.serviceFluid,
            fluidPhase: formData.fluidPhase,
            setPressure: formData.setPressure,
            mawp: formData.mawp,
            valveType: formData.valveType as ValveOperatingType,
        });
        setOpen(false);
    };

    // Calculate ratio for visual
    const ratio = psv.mawp && psv.setPressure ? (psv.setPressure / psv.mawp) * 100 : 0;
    const ratioColor = ratio > 95 ? 'error' : ratio > 85 ? 'warning' : 'success';

    const getValveTypeLabel = (type?: ValveOperatingType) => {
        const option = VALVE_TYPE_OPTIONS.find(o => o.value === type);
        return option?.label || 'Not Set';
    };

    const getValveTypeColor = (type?: ValveOperatingType): 'primary' | 'secondary' | 'warning' | 'default' => {
        switch (type) {
            case 'conventional': return 'default';
            case 'balanced_bellows': return 'primary';
            case 'pilot_operated': return 'secondary';
            default: return 'default';
        }
    };

    return (
        <Paper
            sx={{
                ...glassCardStyles,
                p: 3,
                position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    // transform: 'translateY(-2px)',
                    boxShadow: 6,
                    '& .edit-button': { opacity: 1 },
                },
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h6" fontWeight={600} color="primary">
                    Operating Conditions
                </Typography>
                {canEdit && (
                    <IconButton
                        className="edit-button"
                        size="small"
                        onClick={handleEdit}
                        sx={{ opacity: 0.5, transition: 'opacity 0.2s' }}
                    >
                        <Edit fontSize="small" />
                    </IconButton>
                )}
            </Box>

            <Stack spacing={2}>
                {/* Valve Type - Prominent Display */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    pb: 1.5
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <SettingsIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">Valve Type</Typography>
                    </Box>
                    <Chip
                        size="small"
                        label={getValveTypeLabel(psv.valveType)}
                        color={getValveTypeColor(psv.valveType)}
                        variant="filled"
                    />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Service Fluid</Typography>
                    <Typography variant="body2" fontWeight={500}>{psv.serviceFluid || '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Fluid Phase</Typography>
                    <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'uppercase' }}>{psv.fluidPhase}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Set Pressure</Typography>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                        {formatPressureGauge(psv.setPressure, unitSystem, 2)}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">MAWP</Typography>
                    <Typography variant="body2" fontWeight={700}>
                        {formatPressureGauge(psv.mawp, unitSystem, 2)}
                    </Typography>
                </Box>
                <Box sx={{ pt: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">Set / MAWP Ratio</Typography>
                        <Typography variant="caption" fontWeight={600} color={`${ratioColor}.main`}>{ratio.toFixed(0)}%</Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(ratio, 100)}
                        color={ratioColor}
                        sx={{ height: 6, borderRadius: 3 }}
                    />
                </Box>
            </Stack>

            {/* Edit Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Operating Conditions</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        {/* Valve Type Selector - Toggle Buttons */}
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Valve Operating Type</Typography>
                            <ToggleButtonGroup
                                value={formData.valveType}
                                exclusive
                                onChange={(_e, value) => value && setFormData({ ...formData, valveType: value })}
                                fullWidth
                                size="small"
                            >
                                {VALVE_TYPE_OPTIONS.map(opt => (
                                    <ToggleButton key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                        </Box>
                        <TextField
                            label="Service Fluid"
                            value={formData.serviceFluid}
                            onChange={(e) => setFormData({ ...formData, serviceFluid: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            select
                            label="Fluid Phase"
                            value={formData.fluidPhase}
                            onChange={(e) => setFormData({ ...formData, fluidPhase: e.target.value as FluidPhase })}
                            fullWidth
                        >
                            {PHASE_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </TextField>
                        <UnitSelector
                            label="Set Pressure"
                            value={toDisplay(formData.setPressure, 'pressure')}
                            unit={preferences.pressure}
                            availableUnits={PRESSURE_UNITS}
                            onChange={(val, unit) => {
                                if (unit !== preferences.pressure) setUnit('pressure', unit);
                                setFormData({ ...formData, setPressure: toBase(val || 0, 'pressure', unit) });
                            }}
                            fullWidth
                        />
                        <UnitSelector
                            label="MAWP"
                            value={toDisplay(formData.mawp, 'pressure')}
                            unit={preferences.pressure}
                            availableUnits={PRESSURE_UNITS}
                            onChange={(val, unit) => {
                                if (unit !== preferences.pressure) setUnit('pressure', unit);
                                setFormData({ ...formData, mawp: toBase(val || 0, 'pressure', unit) });
                            }}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}

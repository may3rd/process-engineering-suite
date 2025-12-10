"use client";

import { useState, useEffect } from "react";
import {
    Box,
    TextField,
    Button,
    DialogActions,
    Typography,
    MenuItem,
    InputAdornment,
    Switch,
    FormControlLabel,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Chip,
    Paper,
    Divider,
    Alert,
} from "@mui/material";
import {
    Delete,
    Add,
    CheckCircle,
    Save,
    Close,
} from "@mui/icons-material";
import { OverpressureScenario, ScenarioCause, FluidPhase } from "@/data/types";
import { v4 as uuidv4 } from "uuid";

interface ScenarioEditorProps {
    initialData?: OverpressureScenario;
    psvId: string;
    onSave: (scenario: OverpressureScenario) => void;
    onCancel: () => void;
    onDelete?: (id: string) => void;
}

const CAUSE_OPTIONS: { value: ScenarioCause; label: string }[] = [
    { value: 'blocked_outlet', label: 'Blocked Outlet' },
    { value: 'fire_case', label: 'Fire Case' },
    { value: 'external_fire', label: 'External Fire' },
    { value: 'tube_rupture', label: 'Tube Rupture' },
    { value: 'thermal_expansion', label: 'Thermal Expansion' },
    { value: 'utility_failure', label: 'Utility Failure' },
    { value: 'control_valve_failure', label: 'Control Valve Failure' },
    { value: 'power_failure', label: 'Power Failure' },
    { value: 'cooling_water_failure', label: 'Cooling Water Failure' },
    { value: 'check_valve_failure', label: 'Check Valve Failure' },
    { value: 'other', label: 'Other' },
];

const PHASE_OPTIONS: { value: FluidPhase; label: string }[] = [
    { value: 'gas', label: 'Gas / Vapor' },
    { value: 'liquid', label: 'Liquid' },
    { value: 'steam', label: 'Steam' },
    { value: 'two_phase', label: 'Two-Phase' },
];

export function ScenarioEditor({ initialData, psvId, onSave, onCancel, onDelete }: ScenarioEditorProps) {
    const [formData, setFormData] = useState<Partial<OverpressureScenario>>({
        protectiveSystemId: psvId,
        cause: 'blocked_outlet',
        description: '',
        relievingTemp: 0,
        relievingPressure: 0,
        phase: 'gas',
        relievingRate: 0,
        accumulationPct: 10,
        requiredCapacity: 0,
        assumptions: [],
        codeRefs: ['API-521'],
        isGoverning: false,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [newAssumption, setNewAssumption] = useState("");
    const [newCodeRef, setNewCodeRef] = useState("");

    // Initialize form data if editing
    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleInputChange = (field: keyof OverpressureScenario, value: any) => {
        setFormData({
            ...formData,
            [field]: value,
        });
        // Clear error when field is edited
        if (errors[field]) {
            setErrors({ ...errors, [field]: '' });
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.description) newErrors.description = "Description is required";
        if (formData.relievingRate === undefined || formData.relievingRate < 0) newErrors.relievingRate = "Valid relieving rate is required";
        if (!formData.relievingPressure || formData.relievingPressure <= 0) newErrors.relievingPressure = "Valid relieving pressure is required";
        if (formData.relievingTemp === undefined) newErrors.relievingTemp = "Temperature is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;

        // Auto-set required capacity if 0 or undefined (simple assumption for MVP)
        const finalData = {
            ...formData,
            requiredCapacity: formData.requiredCapacity || formData.relievingRate || 0,
            updatedAt: new Date().toISOString(),
        } as OverpressureScenario;

        if (!finalData.id) {
            finalData.id = uuidv4();
            finalData.createdAt = new Date().toISOString();
        }

        onSave(finalData);
    };

    // List Management Helpers
    const addAssumption = () => {
        if (!newAssumption.trim()) return;
        setFormData({
            ...formData,
            assumptions: [...(formData.assumptions || []), newAssumption.trim()]
        });
        setNewAssumption("");
    };

    const removeAssumption = (index: number) => {
        const newAssumptions = [...(formData.assumptions || [])];
        newAssumptions.splice(index, 1);
        setFormData({ ...formData, assumptions: newAssumptions });
    };

    const addCodeRef = () => {
        if (!newCodeRef.trim()) return;
        setFormData({
            ...formData,
            codeRefs: [...(formData.codeRefs || []), newCodeRef.trim()]
        });
        setNewCodeRef("");
    };

    const removeCodeRef = (index: number) => {
        const newRefs = [...(formData.codeRefs || [])];
        newRefs.splice(index, 1);
        setFormData({ ...formData, codeRefs: newRefs });
    };

    return (
        <Box sx={{ pt: 1 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Scenario Details
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                    <Box>
                        <TextField
                            select
                            label="Cause"
                            value={formData.cause}
                            onChange={(e) => handleInputChange('cause', e.target.value)}
                            fullWidth
                        >
                            {CAUSE_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </TextField>
                    </Box>
                    <Box>
                        <TextField
                            select
                            label="Phase"
                            value={formData.phase}
                            onChange={(e) => handleInputChange('phase', e.target.value)}
                            fullWidth
                        >
                            {PHASE_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </TextField>
                    </Box>
                    <Box sx={{ gridColumn: '1 / -1' }}>
                        <TextField
                            label="Description"
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            error={!!errors.description}
                            helperText={errors.description || "Describe the scenario (e.g., 'Outlet blocked while pumparound active')"}
                            fullWidth
                            multiline
                            rows={2}
                        />
                    </Box>
                    <Box>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.isGoverning}
                                    onChange={(e) => handleInputChange('isGoverning', e.target.checked)}
                                    color="warning"
                                />
                            }
                            label="Governing Case"
                        />
                    </Box>
                </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Relieving Conditions
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                    <TextField
                        label="Relieving Rate"
                        type="number"
                        value={formData.relievingRate}
                        onChange={(e) => handleInputChange('relievingRate', parseFloat(e.target.value))}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">kg/h</InputAdornment>,
                        }}
                        error={!!errors.relievingRate}
                        fullWidth
                    />
                    <TextField
                        label="Relieving Pressure"
                        type="number"
                        value={formData.relievingPressure}
                        onChange={(e) => handleInputChange('relievingPressure', parseFloat(e.target.value))}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">barg</InputAdornment>,
                        }}
                        error={!!errors.relievingPressure}
                        fullWidth
                    />
                    <TextField
                        label="Relieving Temp"
                        type="number"
                        value={formData.relievingTemp}
                        onChange={(e) => handleInputChange('relievingTemp', parseFloat(e.target.value))}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">°C</InputAdornment>,
                        }}
                        error={!!errors.relievingTemp}
                        fullWidth
                    />
                    <TextField
                        label="Accumulation"
                        type="number"
                        value={formData.accumulationPct}
                        onChange={(e) => handleInputChange('accumulationPct', parseFloat(e.target.value))}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                        }}
                        fullWidth
                    />
                </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                {/* Assumptions List */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Assumptions
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                        <List dense disablePadding sx={{ mb: 2 }}>
                            {formData.assumptions?.map((item, idx) => (
                                <ListItem
                                    key={idx}
                                    secondaryAction={
                                        <IconButton edge="end" size="small" onClick={() => removeAssumption(idx)}>
                                            <Close fontSize="small" />
                                        </IconButton>
                                    }
                                    sx={{ borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                                >
                                    <ListItemText primary={item} />
                                </ListItem>
                            ))}
                            {(!formData.assumptions || formData.assumptions.length === 0) && (
                                <Typography variant="caption" color="text.secondary">No assumptions listed.</Typography>
                            )}
                        </List>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                                size="small"
                                placeholder="Add assumption..."
                                value={newAssumption}
                                onChange={(e) => setNewAssumption(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addAssumption();
                                    }
                                }}
                                fullWidth
                            />
                            <IconButton onClick={addAssumption} color="primary" disabled={!newAssumption.trim()}>
                                <Add />
                            </IconButton>
                        </Box>
                    </Paper>
                </Box>

                {/* Code References List */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Code References
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                            {formData.codeRefs?.map((item, idx) => (
                                <Chip
                                    key={idx}
                                    label={item}
                                    onDelete={() => removeCodeRef(idx)}
                                    size="small"
                                />
                            ))}
                            {(!formData.codeRefs || formData.codeRefs.length === 0) && (
                                <Typography variant="caption" color="text.secondary">No codes referenced.</Typography>
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                                size="small"
                                placeholder="Add code ref..."
                                value={newCodeRef}
                                onChange={(e) => setNewCodeRef(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addCodeRef();
                                    }
                                }}
                                fullWidth
                            />
                            <IconButton onClick={addCodeRef} color="primary" disabled={!newCodeRef.trim()}>
                                <Add />
                            </IconButton>
                        </Box>
                    </Paper>
                </Box>
            </Box>

            {/* Footer Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                {onDelete && initialData ? (
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<Delete />}
                        onClick={() => onDelete(initialData.id)}
                    >
                        Delete Scenario
                    </Button>
                ) : <Box />}

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        startIcon={<Save />}
                    >
                        Save Scenario
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}

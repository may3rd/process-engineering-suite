"use client";

import { useState, useEffect } from "react";
import {
    Box,
    TextField,
    Button,
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Card,
    CardContent,
    useTheme,
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
import { useAuthStore } from "@/store/useAuthStore";
import { MarkdownEditor } from "@/components/shared/MarkdownEditor";
import { useProjectUnitSystem } from "@/lib/useProjectUnitSystem";
import { convertValue } from "@/lib/projectUnits";

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
    const canEdit = useAuthStore((state) => state.canEdit());
    const { units } = useProjectUnitSystem();

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

    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");

    const relievingRateDisplay = convertValue(formData.relievingRate ?? null, "kg/h", units.massFlow.unit);
    const relievingPressureDisplay = convertValue(formData.relievingPressure ?? null, "barg", units.pressureGauge.unit);
    const relievingTempDisplay = convertValue(formData.relievingTemp ?? null, "C", units.temperature.unit);

    const handleConfirmDelete = () => {
        if (onDelete && initialData && deleteConfirmationInput === "delete scenario") {
            onDelete(initialData.id);
        }
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
                            disabled={!canEdit}
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
                            disabled={!canEdit}
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
                            disabled={!canEdit}
                        />
                    </Box>
                    <Box>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.isGoverning}
                                    onChange={(e) => handleInputChange('isGoverning', e.target.checked)}
                                    color="warning"
                                    disabled={!canEdit}
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
                        value={relievingRateDisplay ?? ""}
                        onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                                handleInputChange("relievingRate", undefined);
                                return;
                            }
                            const parsed = parseFloat(raw);
                            const base = convertValue(parsed, units.massFlow.unit, "kg/h");
                            handleInputChange("relievingRate", base);
                        }}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">{units.massFlow.label}</InputAdornment>,
                        }}
                        error={!!errors.relievingRate}
                        fullWidth
                        disabled={!canEdit}
                    />
                    <TextField
                        label="Relieving Pressure"
                        type="number"
                        value={relievingPressureDisplay ?? ""}
                        onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                                handleInputChange("relievingPressure", undefined);
                                return;
                            }
                            const parsed = parseFloat(raw);
                            const base = convertValue(parsed, units.pressureGauge.unit, "barg");
                            handleInputChange("relievingPressure", base);
                        }}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">{units.pressureGauge.label}</InputAdornment>,
                        }}
                        error={!!errors.relievingPressure}
                        fullWidth
                        disabled={!canEdit}
                    />
                    <TextField
                        label="Relieving Temp"
                        type="number"
                        value={relievingTempDisplay ?? ""}
                        onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                                handleInputChange("relievingTemp", undefined);
                                return;
                            }
                            const parsed = parseFloat(raw);
                            const base = convertValue(parsed, units.temperature.unit, "C");
                            handleInputChange("relievingTemp", base);
                        }}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">{units.temperature.label}</InputAdornment>,
                        }}
                        error={!!errors.relievingTemp}
                        fullWidth
                        disabled={!canEdit}
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
                        disabled={!canEdit}
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
                                        canEdit && (
                                            <IconButton edge="end" size="small" onClick={() => removeAssumption(idx)}>
                                                <Close fontSize="small" />
                                            </IconButton>
                                        )
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
                                disabled={!canEdit}
                            />
                            <IconButton onClick={addAssumption} color="primary" disabled={!canEdit || !newAssumption.trim()}>
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
                                    onDelete={canEdit ? () => removeCodeRef(idx) : undefined}
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
                                disabled={!canEdit}
                            />
                            <IconButton onClick={addCodeRef} color="primary" disabled={!canEdit || !newCodeRef.trim()}>
                                <Add />
                            </IconButton>
                        </Box>
                    </Paper>
                </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Case Consideration - Markdown Editor */}
            <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Case Consideration
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Document detailed analysis, calculations, and justifications. Supports GitHub-flavored markdown and math (`$...$`, `$$...$$`).
                </Typography>
                <MarkdownEditor
                    value={formData.caseConsideration || ''}
                    onChange={(value) => handleInputChange('caseConsideration', value)}
                    placeholder={`## Relief Scenario Analysis

### Background
Describe the process conditions and operating envelope...

### Design Basis
- Design pressure: 
- Maximum allowable working pressure (MAWP):
- Set pressure:

### Relieving Load Calculation
Document the calculation methodology...

### Conclusions
Summary of findings and recommendations...`}
                    disabled={!canEdit}
                    minRows={8}
                    maxRows={16}
                />
            </Box>


            {/* Footer Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                <Button onClick={onCancel}>
                    {canEdit ? 'Cancel' : 'Close'}
                </Button>
                {canEdit && (
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        startIcon={<Save />}
                    >
                        Save Scenario
                    </Button>
                )}
            </Box>

            {/* Danger Zone - Only show if editing existing scenario and user can edit */}
            {canEdit && onDelete && initialData && (
                <Box sx={{ mt: 4, mb: 3 }}>
                    <Card sx={{
                        border: 1,
                        borderColor: 'error.main',
                        bgcolor: isDark ? 'rgba(244, 67, 54, 0.05)' : 'rgba(211, 47, 47, 0.02)'
                    }}>
                        <Box sx={{ p: 1.5, bgcolor: 'error.main', color: 'error.contrastText' }}>
                            <Typography variant="subtitle2" fontWeight={600}>Danger Zone</Typography>
                        </Box>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>Delete this scenario</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Once deleted, this scenario cannot be recovered.
                                    </Typography>
                                </Box>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    onClick={() => setDeleteDialogOpen(true)}
                                    startIcon={<Delete />}
                                >
                                    Delete Scenario
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Delete Scenario?</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        This action cannot be undone. This will permanently delete this overpressure scenario.
                    </DialogContentText>
                    <Typography variant="body2" gutterBottom>
                        Please type <strong>delete scenario</strong> to confirm.
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        fullWidth
                        variant="outlined"
                        value={deleteConfirmationInput}
                        onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                        placeholder="delete scenario"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConfirmDelete}
                        disabled={deleteConfirmationInput !== "delete scenario"}
                    >
                        Delete Scenario
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

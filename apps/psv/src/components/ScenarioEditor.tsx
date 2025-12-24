"use client";

import { useMemo, useState, useEffect } from "react";
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
import { OverpressureScenario, ScenarioCause, FluidPhase, UnitPreferences } from "@/data/types";
import { usePsvStore } from "@/store/usePsvStore";
import { v4 as uuidv4 } from "uuid";
import { useAuthStore } from "@/store/useAuthStore";
import { MarkdownEditor } from "@/components/shared/MarkdownEditor";
import { useProjectUnitSystem } from "@/lib/useProjectUnitSystem";
import { useUnitConversion } from "@/hooks/useUnitConversion";
import { getDefaultUnitPreferences } from "@/lib/unitPreferences";
import { UnitSelector } from "@/components/shared/UnitSelector";
import { NumericInput } from "@/components/shared/NumericInput";
import { useDisplaySettings } from "@/hooks/useDisplaySettings";
import { getPressureValidationError, getTemperatureValidationError, getPositiveNumberError } from "@/lib/physicsValidation";
import { getScenarioTemplate } from '@/templates/scenarios';

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
    { value: 'tube_rupture', label: 'Tube Rupture' },
    { value: 'thermal_expansion', label: 'Thermal Expansion' },
    { value: 'utility_failure', label: 'Utility Failure' },
    { value: 'control_valve_failure', label: 'Control Valve Failure' },
    { value: 'power_failure', label: 'Power Failure' },
    { value: 'cooling_water_failure', label: 'Cooling Water Failure' },
    { value: 'reflux_failure', label: 'Loss of Reflux' },
    { value: 'abnormal_heat_input', label: 'Abnormal Heat Input' },
    { value: 'check_valve_failure', label: 'Check Valve Failure' },
    { value: 'other', label: 'Other' },
];

const PHASE_OPTIONS: { value: FluidPhase; label: string }[] = [
    { value: 'gas', label: 'Gas / Vapor' },
    { value: 'liquid', label: 'Liquid' },
    { value: 'steam', label: 'Steam' },
    { value: 'two_phase', label: 'Two-Phase' },
];

// Unit options (same as SizingWorkspace)
const PRESSURE_UNITS = ['barg', 'bara', 'kPag', 'kg_cm2g', 'psig', 'psia', 'kPa'];
const TEMPERATURE_UNITS = ['C', 'F', 'K'];
const FLOW_UNITS = ['kg/h', 'lb/h', 'kg/s'];

export function ScenarioEditor({ initialData, psvId, onSave, onCancel, onDelete }: ScenarioEditorProps) {
    const canEdit = useAuthStore((state) => state.canEdit());
    const { unitSystem } = useProjectUnitSystem();

    // Unit conversion with selectable preferences
    const defaultPreferences: UnitPreferences = getDefaultUnitPreferences(unitSystem);
    const { preferences, setUnit, toDisplay, toBase } = useUnitConversion(defaultPreferences);

    const [formData, setFormData] = useState<Partial<OverpressureScenario>>(() => {
        // Get PSV's set pressure for default
        const state = usePsvStore.getState();
        const psv = state.selectedPsv;
        const defaultSetPressure = psv?.setPressure ?? 0;

        return {
            protectiveSystemId: psvId,
            cause: 'blocked_outlet',
            description: '',
            relievingTemp: 0,
            relievingPressure: defaultSetPressure * 1.1, // Default to 110% of set pressure
            phase: 'gas',
            relievingRate: 0,
            accumulationPct: 10,
            requiredCapacity: 0,
            assumptions: [],
            codeRefs: ['API-521'],
            isGoverning: false,
            setPressure: defaultSetPressure, // Cascade from PSV
        };
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [dismissedValidationWarning, setDismissedValidationWarning] = useState(false);
    const [newAssumption, setNewAssumption] = useState("");
    const [newCodeRef, setNewCodeRef] = useState("");

    // Initialize form data if editing
    useEffect(() => {
        if (initialData) {
            // If editing an existing scenario without setPressure, cascade from PSV
            const state = usePsvStore.getState();
            const psv = state.selectedPsv;
            const defaultSetPressure = psv?.setPressure ?? 0;

            setFormData({
                ...initialData,
                setPressure: initialData.setPressure ?? defaultSetPressure,
            });
            setTouched({});
            setErrors({});
            setDismissedValidationWarning(false);
        }
    }, [initialData]);

    const getValidationErrors = (data: Partial<OverpressureScenario>) => {
        const newErrors: Record<string, string> = {};

        if (!data.description?.trim()) {
            newErrors.description = "Description is required";
        }

        const rateError = getPositiveNumberError(data.relievingRate, "Relieving rate");
        if (rateError) {
            newErrors.relievingRate = rateError;
        }

        const pressureError = getPressureValidationError(data.relievingPressure, "barg", "Relieving pressure");
        if (pressureError) {
            newErrors.relievingPressure = pressureError;
        }

        const tempError = getTemperatureValidationError(data.relievingTemp, "C", "Relieving temperature");
        if (tempError) {
            newErrors.relievingTemp = tempError;
        }

        return newErrors;
    };

    const liveErrors = useMemo(() => getValidationErrors(formData), [formData]);
    const isFormValid = Object.keys(liveErrors).length === 0;
    const hasTouchedAnyField = Object.values(touched).some(Boolean);

    const handleInputChange = (field: keyof OverpressureScenario, value: any) => {
        setFormData({
            ...formData,
            [field]: value,
        });
        setTouched((prev) => ({ ...prev, [field]: true }));
        // Clear error when field is edited
        if (errors[field]) {
            setErrors({ ...errors, [field]: '' });
        }
    };

    /**
     * Handle cause change with template population.
     * When the scenario cause changes, populate caseConsideration with the template
     * if it's empty or unchanged from a previous template.
     */
    const handleCauseChange = (newCause: ScenarioCause) => {
        const currentCause = formData.cause as ScenarioCause;
        const currentTemplate = currentCause ? getScenarioTemplate(currentCause) : '';
        const currentContent = formData.caseConsideration || '';

        // Check if caseConsideration is empty or matches the previous template
        const isEmpty = !currentContent.trim();
        const isUnchangedTemplate = currentContent.trim() === currentTemplate.trim();

        // Update formData with new cause
        const updates: Partial<OverpressureScenario> = { cause: newCause };

        // Populate template if content is empty or unchanged from previous template
        if (isEmpty || isUnchangedTemplate) {
            updates.caseConsideration = getScenarioTemplate(newCause);
        }

        setFormData({ ...formData, ...updates });
        setTouched((prev) => ({ ...prev, cause: true }));
    };

    const validate = () => {
        const newErrors = getValidationErrors(formData);
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) {
            setDismissedValidationWarning(false);
            return;
        }

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

    // Get decimal place settings from user preferences
    const { decimalPlaces } = useDisplaySettings();

    // Convert base values (kg/h, barg, °C) to display values in selected units
    // Apply user's decimal place preferences
    const relievingRateBase = toDisplay(formData.relievingRate ?? 0, 'flow');
    const relievingRateDisplay: number | '' = Number.isFinite(relievingRateBase)
        ? Number(relievingRateBase.toFixed(decimalPlaces.flow))
        : '';

    const relievingPressureBase = toDisplay(formData.relievingPressure ?? 0, 'pressure');
    const relievingPressureDisplay: number | '' = Number.isFinite(relievingPressureBase)
        ? Number(relievingPressureBase.toFixed(decimalPlaces.pressure))
        : '';

    const relievingTempBase = toDisplay(formData.relievingTemp ?? 0, 'temperature');
    const relievingTempDisplay: number | '' = Number.isFinite(relievingTempBase)
        ? Number(relievingTempBase.toFixed(decimalPlaces.temperature))
        : '';

    const setPressureBase = toDisplay(formData.setPressure ?? 0, 'pressure');
    const setPressureDisplay: number | '' = Number.isFinite(setPressureBase)
        ? Number(setPressureBase.toFixed(decimalPlaces.pressure))
        : '';

    useEffect(() => {
        if (isFormValid) setDismissedValidationWarning(false);
    }, [isFormValid]);

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
            {!dismissedValidationWarning && canEdit && !isFormValid && hasTouchedAnyField && (
                <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setDismissedValidationWarning(true)}>
                    Fix the highlighted fields to enable Save.
                </Alert>
            )}
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
                            onChange={(e) => handleCauseChange(e.target.value as ScenarioCause)}
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
                {/* Row 1: Set Pressure, Relieving Pressure, Accumulation */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 2 }}>
                    <UnitSelector
                        label="Set Pressure"
                        value={setPressureDisplay === '' ? null : setPressureDisplay}
                        unit={preferences.pressure}
                        availableUnits={PRESSURE_UNITS}
                        onChange={(val, unit) => {
                            if (unit !== preferences.pressure) setUnit('pressure', unit);
                            const base = val !== null ? toBase(val, 'pressure', unit) : undefined;
                            handleInputChange("setPressure", base);
                        }}
                        disabled={!canEdit}
                    />
                    <UnitSelector
                        label="Relieving Pressure"
                        value={relievingPressureDisplay === '' ? null : relievingPressureDisplay}
                        unit={preferences.pressure}
                        availableUnits={PRESSURE_UNITS}
                        onChange={(val, unit) => {
                            if (unit !== preferences.pressure) setUnit('pressure', unit);
                            const base = val !== null ? toBase(val, 'pressure', unit) : undefined;
                            handleInputChange("relievingPressure", base);
                        }}
                        error={!!errors.relievingPressure}
                        helperText={errors.relievingPressure}
                        disabled={!canEdit}
                    />
                    <NumericInput
                        label="Accumulation"
                        value={formData.accumulationPct}
                        onChange={(val) => handleInputChange('accumulationPct', val)}
                        onBlur={(committedAccumulation) => {
                            // Recalculate relieving pressure when accumulation changes
                            const setPressure = formData.setPressure ?? 0;
                            const accumulation = committedAccumulation ?? 10;
                            const newRelievingPressure = setPressure * (1 + accumulation / 100);
                            handleInputChange('relievingPressure', newRelievingPressure);
                        }}
                        endAdornment="%"
                        disabled={!canEdit}
                    />
                </Box>
                {/* Row 2: Relieving Rate, Relieving Temp */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                    <UnitSelector
                        label="Relieving Rate"
                        value={relievingRateDisplay === '' ? null : relievingRateDisplay}
                        unit={preferences.flow}
                        availableUnits={FLOW_UNITS}
                        onChange={(val, unit) => {
                            if (unit !== preferences.flow) setUnit('flow', unit);
                            const base = val !== null ? toBase(val, 'flow', unit) : undefined;
                            handleInputChange("relievingRate", base);
                        }}
                        error={!!errors.relievingRate}
                        helperText={errors.relievingRate}
                        disabled={!canEdit}
                    />
                    <UnitSelector
                        label="Relieving Temp"
                        value={relievingTempDisplay === '' ? null : relievingTempDisplay}
                        unit={preferences.temperature}
                        availableUnits={TEMPERATURE_UNITS}
                        onChange={(val, unit) => {
                            if (unit !== preferences.temperature) setUnit('temperature', unit);
                            const base = val !== null ? toBase(val, 'temperature', unit) : undefined;
                            handleInputChange("relievingTemp", base);
                        }}
                        error={!!errors.relievingTemp}
                        helperText={errors.relievingTemp}
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
                        disabled={!isFormValid}
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

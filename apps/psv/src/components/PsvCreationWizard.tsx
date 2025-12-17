/**
 * PSV Creation Wizard Component
 * 
 * Guided 5-step wizard for creating new PSV/RD devices
 * Similar pattern to FireCaseScenarioDialog
 */

import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stepper,
    Step,
    StepLabel,
    Box,
    Typography,
    TextField,
    MenuItem,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    IconButton,
    Stack,
    InputAdornment,
} from '@mui/material';
import { Close, ArrowBack, ArrowForward, Check } from '@mui/icons-material';
import { DesignCode, FluidPhase, ValveOperatingType, ProtectiveSystemType } from '@/data/types';
import { usePsvStore } from '@/store/usePsvStore';
import { useProjectUnitSystem } from '@/lib/useProjectUnitSystem';
import { v4 as uuidv4 } from 'uuid';

interface PsvCreationWizardProps {
    open: boolean;
    onClose: () => void;
    projectId: string;
}

interface WizardFormData {
    // Step 1: Basic Information
    tag: string;
    type: ProtectiveSystemType;
    setPressure: number;
    setPressureUnit: string;
    designCode: DesignCode;

    // Step 2: Service Conditions
    operatingPressure: number;
    operatingPressureUnit: string;
    operatingTemperature: number;
    operatingTemperatureUnit: string;
    fluidName: string;
    fluidPhase: FluidPhase;
    fluidDescription: string;

    // Step 3: Design Details
    designPressure: number;
    designPressureUnit: string;
    designTemperature: number;
    designTemperatureUnit: string;
    designStandard: string;
    inletSize: number;
    inletSizeUnit: string;
    outletSize: number;
    outletSizeUnit: string;
    valveType: ValveOperatingType;

    // Step 4: Equipment Links
    linkedEquipment: string[];
    primaryEquipmentId: string;
}

const STEPS = [
    'Basic Information',
    'Service Conditions',
    'Design Details',
    'Equipment Links',
    'Review & Create',
];

export function PsvCreationWizard({ open, onClose, projectId }: PsvCreationWizardProps) {
    const { unitSystem } = useProjectUnitSystem();
    const { addProtectiveSystem, selectPsv, protectiveSystems } = usePsvStore();

    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState<WizardFormData>({
        // Step 1 defaults
        tag: '',
        type: 'PSV',
        setPressure: 0,
        setPressureUnit: unitSystem === 'imperial' ? 'psig' : 'barg',
        designCode: 'API-520',

        // Step 2 defaults
        operatingPressure: 0,
        operatingPressureUnit: unitSystem === 'imperial' ? 'psig' : 'barg',
        operatingTemperature: 25,
        operatingTemperatureUnit: unitSystem === 'imperial' ? 'F' : 'C',
        fluidName: '',
        fluidPhase: 'gas',
        fluidDescription: '',

        // Step 3 defaults
        designPressure: 0,
        designPressureUnit: unitSystem === 'imperial' ? 'psig' : 'barg',
        designTemperature: 50,
        designTemperatureUnit: unitSystem === 'imperial' ? 'F' : 'C',
        designStandard: 'API-520',
        inletSize: 0,
        inletSizeUnit: unitSystem === 'imperial' ? 'in' : 'mm',
        outletSize: 0,
        outletSizeUnit: unitSystem === 'imperial' ? 'in' : 'mm',
        valveType: 'conventional',

        // Step 4 defaults
        linkedEquipment: [],
        primaryEquipmentId: '',
    });

    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const handleNext = () => {
        // Validate current step before proceeding
        if (validateStep(activeStep)) {
            setActiveStep((prev) => prev + 1);
        }
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    const handleClose = () => {
        setActiveStep(0);
        setValidationErrors({});
        onClose();
    };

    const validateStep = (step: number): boolean => {
        const errors: Record<string, string> = {};

        switch (step) {
            case 0: // Basic Information
                if (!formData.tag.trim()) {
                    errors.tag = 'Equipment tag is required';
                } else if (protectiveSystems.some(psv => psv.tag === formData.tag)) {
                    errors.tag = 'Tag already exists';
                }
                if (formData.setPressure <= 0) {
                    errors.setPressure = 'Set pressure must be greater than 0';
                }
                break;

            case 1: // Service Conditions
                if (formData.operatingPressure <= 0) {
                    errors.operatingPressure = 'Operating pressure must be greater than 0';
                }
                if (formData.operatingTemperature < -273) {
                    errors.operatingTemperature = 'Temperature must be above absolute zero';
                }
                if (!formData.fluidName.trim()) {
                    errors.fluidName = 'Fluid name is required';
                }
                break;

            case 2: // Design Details
                if (formData.designPressure < formData.operatingPressure) {
                    errors.designPressure = 'Design pressure must be >= operating pressure';
                }
                if (formData.designTemperature < formData.operatingTemperature) {
                    errors.designTemperature = 'Design temperature must be >= operating temperature';
                }
                break;

            case 3: // Equipment Links
                // Optional - no required fields
                break;
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreate = async () => {
        if (!validateStep(activeStep)) return;

        const newPsv: Omit<any, 'id' | 'createdAt' | 'updatedAt'> = {
            projectId,
            tag: formData.tag,
            type: formData.type,
            name: `${formData.type}-${formData.tag}`,
            service: formData.fluidDescription || formData.fluidName,
            fluidName: formData.fluidName,
            fluidPhase: formData.fluidPhase,
            setPressure: formData.setPressure,
            setPressureUnit: formData.setPressureUnit,
            designPressure: formData.designPressure,
            designPressureUnit: formData.designPressureUnit,
            designTemperature: formData.designTemperature,
            designTemperatureUnit: formData.designTemperatureUnit,
            operatingPressure: formData.operatingPressure,
            operatingPressureUnit: formData.operatingPressureUnit,
            operatingTemperature: formData.operatingTemperature,
            operatingTemperatureUnit: formData.operatingTemperatureUnit,
            inletSize: formData.inletSize || undefined,
            inletSizeUnit: formData.inletSizeUnit || undefined,
            outletSize: formData.outletSize || undefined,
            outletSizeUnit: formData.outletSizeUnit || undefined,
            designCode: formData.designCode,
            designStandard: formData.designStandard,
            valveType: formData.valveType,
            status: 'draft' as const,
            tags: [],
        };

        try {
            await addProtectiveSystem(newPsv);
            // Find the newly created PSV and navigate to it
            const createdPsv = protectiveSystems.find(psv => psv.tag === formData.tag);
            if (createdPsv) {
                await selectPsv(createdPsv.id);
            }
            handleClose();
        } catch (error) {
            console.error('Failed to create PSV:', error);
            setValidationErrors({ submit: 'Failed to create PSV. Please try again.' });
        }
    };

    const updateFormData = (updates: Partial<WizardFormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
        // Clear validation errors for updated fields
        setValidationErrors(prev => {
            const newErrors = { ...prev };
            Object.keys(updates).forEach(key => delete newErrors[key]);
            return newErrors;
        });
    };

    const renderStepContent = (step: number) => {
        switch (step) {
            case 0:
                return renderBasicInformation();
            case 1:
                return renderServiceConditions();
            case 2:
                return renderDesignDetails();
            case 3:
                return renderEquipmentLinks();
            case 4:
                return renderReview();
            default:
                return null;
        }
    };

    const renderBasicInformation = () => (
        <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Enter the basic identification and classification for this protective device.
            </Typography>

            <Stack spacing={3}>
                <TextField
                    label="Equipment Tag"
                    required
                    value={formData.tag}
                    onChange={(e) => updateFormData({ tag: e.target.value.toUpperCase() })}
                    error={!!validationErrors.tag}
                    helperText={validationErrors.tag || 'Unique identifier (e.g., PSV-101)'}
                    fullWidth
                    autoFocus
                />

                <FormControl component="fieldset">
                    <FormLabel component="legend">Device Type *</FormLabel>
                    <RadioGroup
                        row
                        value={formData.type}
                        onChange={(e) => updateFormData({ type: e.target.value as ProtectiveSystemType })}
                    >
                        <FormControlLabel value="PSV" control={<Radio />} label="Pressure Safety Valve" />
                        <FormControlLabel value="RD" control={<Radio />} label="Rupture Disc" />
                        <FormControlLabel value="CSO" control={<Radio />} label="Conservation Vent" />
                    </RadioGroup>
                </FormControl>

                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Set Pressure *
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            type="number"
                            value={formData.setPressure}
                            onChange={(e) => updateFormData({ setPressure: parseFloat(e.target.value) || 0 })}
                            error={!!validationErrors.setPressure}
                            helperText={validationErrors.setPressure}
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            select
                            value={formData.setPressureUnit}
                            onChange={(e) => updateFormData({ setPressureUnit: e.target.value })}
                            sx={{ minWidth: 100 }}
                        >
                            <MenuItem value="barg">barg</MenuItem>
                            <MenuItem value="psig">psig</MenuItem>
                            <MenuItem value="kPag">kPag</MenuItem>
                        </TextField>
                    </Stack>
                </Box>

                <TextField
                    label="Design Code"
                    select
                    required
                    value={formData.designCode}
                    onChange={(e) => updateFormData({ designCode: e.target.value as DesignCode })}
                    helperText="Sizing and selection standard"
                    fullWidth
                >
                    <MenuItem value="API-520">API-520 (Sizing)</MenuItem>
                    <MenuItem value="API-521">API-521 (Fire Relief)</MenuItem>
                    <MenuItem value="API-2000">API-2000 (Atmospheric Tanks)</MenuItem>
                    <MenuItem value="ASME-VIII">ASME Section VIII</MenuItem>
                    <MenuItem value="ISO-4126">ISO-4126</MenuItem>
                </TextField>
            </Stack>
        </Box>
    );

    const renderServiceConditions = () => (
        <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Define the normal operating conditions for the protected system.
            </Typography>

            <Stack spacing={3}>
                {/* Operating Pressure */}
                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Normal Operating Pressure *
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            type="number"
                            value={formData.operatingPressure}
                            onChange={(e) => updateFormData({ operatingPressure: parseFloat(e.target.value) || 0 })}
                            error={!!validationErrors.operatingPressure}
                            helperText={validationErrors.operatingPressure}
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            select
                            value={formData.operatingPressureUnit}
                            onChange={(e) => updateFormData({ operatingPressureUnit: e.target.value })}
                            sx={{ minWidth: 100 }}
                        >
                            <MenuItem value="barg">barg</MenuItem>
                            <MenuItem value="psig">psig</MenuItem>
                            <MenuItem value="kPag">kPag</MenuItem>
                        </TextField>
                    </Stack>
                </Box>

                {/* Operating Temperature */}
                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Normal Operating Temperature *
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            type="number"
                            value={formData.operatingTemperature}
                            onChange={(e) => updateFormData({ operatingTemperature: parseFloat(e.target.value) || 0 })}
                            error={!!validationErrors.operatingTemperature}
                            helperText={validationErrors.operatingTemperature}
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            select
                            value={formData.operatingTemperatureUnit}
                            onChange={(e) => updateFormData({ operatingTemperatureUnit: e.target.value })}
                            sx={{ minWidth: 100 }}
                        >
                            <MenuItem value="C">°C</MenuItem>
                            <MenuItem value="F">°F</MenuItem>
                            <MenuItem value="K">K</MenuItem>
                        </TextField>
                    </Stack>
                </Box>

                {/* Fluid Name */}
                <TextField
                    label="Fluid Name"
                    required
                    value={formData.fluidName}
                    onChange={(e) => updateFormData({ fluidName: e.target.value })}
                    error={!!validationErrors.fluidName}
                    helperText={validationErrors.fluidName || 'e.g., Natural Gas, Propane, Water'}
                    fullWidth
                />

                {/* Fluid Phase */}
                <FormControl component="fieldset">
                    <FormLabel component="legend">Fluid Phase *</FormLabel>
                    <RadioGroup
                        row
                        value={formData.fluidPhase}
                        onChange={(e) => updateFormData({ fluidPhase: e.target.value as FluidPhase })}
                    >
                        <FormControlLabel value="gas" control={<Radio />} label="Gas/Vapor" />
                        <FormControlLabel value="liquid" control={<Radio />} label="Liquid" />
                        <FormControlLabel value="two_phase" control={<Radio />} label="Two-Phase" />
                        <FormControlLabel value="steam" control={<Radio />} label="Steam" />
                    </RadioGroup>
                </FormControl>

                {/* Service Description */}
                <TextField
                    label="Service Description"
                    value={formData.fluidDescription}
                    onChange={(e) => updateFormData({ fluidDescription: e.target.value })}
                    helperText="Optional - brief description of the service"
                    multiline
                    rows={2}
                    fullWidth
                />
            </Stack>
        </Box>
    );

    const renderDesignDetails = () => (
        <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Specify design conditions and sizing parameters.
            </Typography>

            <Stack spacing={3}>
                {/* Design Pressure */}
                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Design Pressure (MAWP) *
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            type="number"
                            value={formData.designPressure}
                            onChange={(e) => updateFormData({ designPressure: parseFloat(e.target.value) || 0 })}
                            error={!!validationErrors.designPressure}
                            helperText={validationErrors.designPressure}
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            select
                            value={formData.designPressureUnit}
                            onChange={(e) => updateFormData({ designPressureUnit: e.target.value })}
                            sx={{ minWidth: 100 }}
                        >
                            <MenuItem value="barg">barg</MenuItem>
                            <MenuItem value="psig">psig</MenuItem>
                            <MenuItem value="kPag">kPag</MenuItem>
                        </TextField>
                    </Stack>
                </Box>

                {/* Design Temperature */}
                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Design Temperature *
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            type="number"
                            value={formData.designTemperature}
                            onChange={(e) => updateFormData({ designTemperature: parseFloat(e.target.value) || 0 })}
                            error={!!validationErrors.designTemperature}
                            helperText={validationErrors.designTemperature}
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            select
                            value={formData.designTemperatureUnit}
                            onChange={(e) => updateFormData({ designTemperatureUnit: e.target.value })}
                            sx={{ minWidth: 100 }}
                        >
                            <MenuItem value="C">°C</MenuItem>
                            <MenuItem value="F">°F</MenuItem>
                            <MenuItem value="K">K</MenuItem>
                        </TextField>
                    </Stack>
                </Box>

                {/* Design Standard */}
                <TextField
                    label="Design Standard"
                    select
                    value={formData.designStandard}
                    onChange={(e) => updateFormData({ designStandard: e.target.value })}
                    helperText="Construction and testing standard"
                    fullWidth
                >
                    <MenuItem value="API-520">API-520</MenuItem>
                    <MenuItem value="API-521">API-521</MenuItem>
                    <MenuItem value="ASME-VIII">ASME Section VIII</MenuItem>
                    <MenuItem value="ISO-4126">ISO-4126</MenuItem>
                </TextField>

                {/* Optional: Inlet Size */}
                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Inlet Size (Optional)
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            type="number"
                            value={formData.inletSize}
                            onChange={(e) => updateFormData({ inletSize: parseFloat(e.target.value) || 0 })}
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            select
                            value={formData.inletSizeUnit}
                            onChange={(e) => updateFormData({ inletSizeUnit: e.target.value })}
                            sx={{ minWidth: 100 }}
                        >
                            <MenuItem value="mm">mm</MenuItem>
                            <MenuItem value="in">in</MenuItem>
                        </TextField>
                    </Stack>
                </Box>

                {/* Optional: Outlet Size */}
                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Outlet Size (Optional)
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            type="number"
                            value={formData.outletSize}
                            onChange={(e) => updateFormData({ outletSize: parseFloat(e.target.value) || 0 })}
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            select
                            value={formData.outletSizeUnit}
                            onChange={(e) => updateFormData({ outletSizeUnit: e.target.value })}
                            sx={{ minWidth: 100 }}
                        >
                            <MenuItem value="mm">mm</MenuItem>
                            <MenuItem value="in">in</MenuItem>
                        </TextField>
                    </Stack>
                </Box>

                {/* Valve Type */}
                <TextField
                    label="Valve Type"
                    select
                    value={formData.valveType}
                    onChange={(e) => updateFormData({ valveType: e.target.value as ValveOperatingType })}
                    helperText="Operating mechanism"
                    fullWidth
                >
                    <MenuItem value="conventional">Conventional</MenuItem>
                    <MenuItem value="balanced_bellows">Balanced Bellows</MenuItem>
                    <MenuItem value="pilot_operated">Pilot Operated</MenuItem>
                </TextField>
            </Stack>
        </Box>
    );

    const renderEquipmentLinks = () => (
        <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Link protected equipment to this PSV (optional - can be added later).
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Equipment linking will be available in the PSV detail view.
                <br />
                You can add equipment links after creating the PSV.
            </Typography>
        </Box>
    );

    const renderReview = () => (
        <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Review your inputs before creating the PSV.
            </Typography>

            <Stack spacing={2}>
                {/* Basic Information */}
                <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600}>Basic Information</Typography>
                        <Button size="small" onClick={() => setActiveStep(0)}>Edit</Button>
                    </Box>
                    <Typography variant="body2">Tag: <strong>{formData.tag}</strong></Typography>
                    <Typography variant="body2">Type: <strong>{formData.type}</strong></Typography>
                    <Typography variant="body2">Set Pressure: <strong>{formData.setPressure} {formData.setPressureUnit}</strong></Typography>
                    <Typography variant="body2">Design Code: <strong>{formData.designCode}</strong></Typography>
                </Box>

                {/* Service Conditions */}
                <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600}>Service Conditions</Typography>
                        <Button size="small" onClick={() => setActiveStep(1)}>Edit</Button>
                    </Box>
                    <Typography variant="body2">Operating P: <strong>{formData.operatingPressure} {formData.operatingPressureUnit}</strong></Typography>
                    <Typography variant="body2">Operating T: <strong>{formData.operatingTemperature} {formData.operatingTemperatureUnit}</strong></Typography>
                    <Typography variant="body2">Fluid: <strong>{formData.fluidName} ({formData.fluidPhase})</strong></Typography>
                </Box>

                {/* Design Details */}
                <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600}>Design Details</Typography>
                        <Button size="small" onClick={() => setActiveStep(2)}>Edit</Button>
                    </Box>
                    <Typography variant="body2">Design P: <strong>{formData.designPressure} {formData.designPressureUnit}</strong></Typography>
                    <Typography variant="body2">Design T: <strong>{formData.designTemperature} {formData.designTemperatureUnit}</strong></Typography>
                    <Typography variant="body2">Valve Type: <strong>{formData.valveType}</strong></Typography>
                </Box>

                {validationErrors.submit && (
                    <Typography color="error" variant="body2">
                        {validationErrors.submit}
                    </Typography>
                )}
            </Stack>
        </Box>
    );

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    height: '80vh',
                    maxHeight: 800,
                }
            }}
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6">Create New PSV/RD</Typography>
                    <IconButton onClick={handleClose} size="small">
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
                    {STEPS.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {renderStepContent(activeStep)}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={handleClose}>
                    Cancel
                </Button>
                <Box sx={{ flex: 1 }} />
                <Button
                    onClick={handleBack}
                    disabled={activeStep === 0}
                    startIcon={<ArrowBack />}
                >
                    Back
                </Button>
                {activeStep === STEPS.length - 1 ? (
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        startIcon={<Check />}
                        color="success"
                    >
                        Create PSV
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        onClick={handleNext}
                        endIcon={<ArrowForward />}
                    >
                        Next
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}

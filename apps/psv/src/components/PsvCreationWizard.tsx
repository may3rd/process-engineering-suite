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
import { DesignCode, FluidPhase, ValveOperatingType, ProtectiveSystem, ProtectiveSystemType } from '@/data/types';
import { usePsvStore } from '@/store/usePsvStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useProjectUnitSystem } from '@/lib/useProjectUnitSystem';
import { UnitSelector } from './shared/UnitSelector';

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
    const { addProtectiveSystem, selectPsv, protectiveSystems, selectedArea, selectedProject } = usePsvStore();
    const { currentUser } = useAuthStore();

    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState<WizardFormData>({
        // Step 1 defaults
        tag: '',
        type: 'psv',
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

        if (!selectedArea) {
            setValidationErrors({ submit: 'No area selected. Please select an area first.' });
            return;
        }

        const newPsv: Omit<ProtectiveSystem, 'id' | 'createdAt' | 'updatedAt'> = {
            areaId: selectedArea.id,
            projectIds: [projectId],
            tag: formData.tag,
            type: formData.type,
            name: formData.fluidDescription || formData.fluidName,
            designCode: formData.designCode,
            serviceFluid: formData.fluidName,
            fluidPhase: formData.fluidPhase,
            setPressure: formData.setPressure,
            mawp: formData.designPressure, // Use design pressure as MAWP
            ownerId: currentUser?.id || 'f6c289ac-fabe-4d2e-a635-127e5b9045ad', // Fallback to Admin ID (exists in seed) if auth fails
            status: 'draft',
            valveType: formData.valveType,
            tags: [],
            isActive: true,
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
                        <FormControlLabel value="psv" control={<Radio />} label="Pressure Safety Valve" />
                        <FormControlLabel value="rupture_disc" control={<Radio />} label="Rupture Disc" />
                        <FormControlLabel value="breather_valve" control={<Radio />} label="Breather Valve (Conservation Vent)" />
                    </RadioGroup>
                </FormControl>

                <UnitSelector
                    label="Set Pressure"
                    value={formData.setPressure}
                    unit={formData.setPressureUnit}
                    availableUnits={['barg', 'psig', 'kPag', 'MPag', 'bara', 'psia'] as const}
                    onChange={(val, unit) => updateFormData({ setPressure: val || 0, setPressureUnit: unit })}
                    required
                    error={!!validationErrors.setPressure}
                    helperText={validationErrors.setPressure}
                />

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
                <UnitSelector
                    label="Normal Operating Pressure"
                    value={formData.operatingPressure}
                    unit={formData.operatingPressureUnit}
                    availableUnits={['barg', 'psig', 'kPag', 'MPag', 'bara', 'psia'] as const}
                    onChange={(val, unit) => updateFormData({ operatingPressure: val || 0, operatingPressureUnit: unit })}
                    required
                    error={!!validationErrors.operatingPressure}
                    helperText={validationErrors.operatingPressure}
                />

                {/* Operating Temperature */}
                <UnitSelector
                    label="Normal Operating Temperature"
                    value={formData.operatingTemperature}
                    unit={formData.operatingTemperatureUnit}
                    availableUnits={['C', 'F', 'K'] as const}
                    onChange={(val, unit) => updateFormData({ operatingTemperature: val || 0, operatingTemperatureUnit: unit })}
                    required
                    error={!!validationErrors.operatingTemperature}
                    helperText={validationErrors.operatingTemperature}
                />

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
                <UnitSelector
                    label="Design Pressure (MAWP)"
                    value={formData.designPressure}
                    unit={formData.designPressureUnit}
                    availableUnits={['barg', 'psig', 'kPag', 'MPag', 'bara', 'psia'] as const}
                    onChange={(val, unit) => updateFormData({ designPressure: val || 0, designPressureUnit: unit })}
                    required
                    error={!!validationErrors.designPressure}
                    helperText={validationErrors.designPressure}
                />

                {/* Design Temperature */}
                <UnitSelector
                    label="Design Temperature"
                    value={formData.designTemperature}
                    unit={formData.designTemperatureUnit}
                    availableUnits={['C', 'F', 'K'] as const}
                    onChange={(val, unit) => updateFormData({ designTemperature: val || 0, designTemperatureUnit: unit })}
                    required
                    error={!!validationErrors.designTemperature}
                    helperText={validationErrors.designTemperature}
                />

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
                <UnitSelector
                    label="Inlet Size (Optional)"
                    value={formData.inletSize}
                    unit={formData.inletSizeUnit}
                    availableUnits={['mm', 'in'] as const}
                    onChange={(val, unit) => updateFormData({ inletSize: val || 0, inletSizeUnit: unit })}
                />

                {/* Optional: Outlet Size */}
                <UnitSelector
                    label="Outlet Size (Optional)"
                    value={formData.outletSize}
                    unit={formData.outletSizeUnit}
                    availableUnits={['mm', 'in'] as const}
                    onChange={(val, unit) => updateFormData({ outletSize: val || 0, outletSizeUnit: unit })}
                />

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

"use client";

import React, { useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    MenuItem,
    InputAdornment,
    Alert,
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { ScenarioWizardLayout } from './ScenarioWizardLayout';
import { OverpressureScenario, FluidPhase } from '@/data/types';
import { useUnitConversion } from '@/hooks/useUnitConversion';
import { useProjectUnitSystem } from '@/lib/useProjectUnitSystem';
import { getDefaultUnitPreferences } from '@/lib/unitPreferences';
import { getPressureValidationError, getPositiveNumberError } from '@/lib/physicsValidation';

interface ControlValveFailureDialogProps {
    open: boolean;
    onClose: () => void;
    psvId: string;
    onSave: (scenario: Partial<OverpressureScenario>) => void;
}

const steps = ['Valve Parameters', 'Scenario Details', 'Review'];

export function ControlValveFailureDialog({
    open,
    onClose,
    psvId,
    onSave,
}: ControlValveFailureDialogProps) {
    const [activeStep, setActiveStep] = useState(0);
    const { unitSystem } = useProjectUnitSystem();
    const defaultPreferences = getDefaultUnitPreferences(unitSystem);
    const { preferences, setUnit, toDisplay, toBase } = useUnitConversion(defaultPreferences);

    const [formData, setFormData] = useState({
        phase: 'gas' as FluidPhase,
        description: 'Control Valve Failure: [Tag] failing wide open',
        cvTag: '',
        ratedCv: 0,
        upstreamPressure: 0, // Base unit (Pa)
        upstreamTemp: 300, // Kelvin
        assumptions: [
            'Control valve fails wide open',
            'Bypass valve remains closed',
            'Downstream pressure rises to accumulation pressure',
        ],
    });

    // Local display state
    const [displayValues, setDisplayValues] = useState({
        ratedCv: 0,
        upstreamPressure: 0,
        upstreamTemp: 25, // C
    });
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const validateValveStep = () => {
        const errors: string[] = [];
        const cvError = getPositiveNumberError(displayValues.ratedCv, 'Rated Cv');
        if (cvError) errors.push(cvError);
        const pressureError = getPressureValidationError(displayValues.upstreamPressure, preferences.pressure, 'Upstream pressure');
        if (pressureError) errors.push(pressureError);
        return errors;
    };

    const handleNext = () => {
        if (activeStep === 0) {
            const errors = validateValveStep();
            if (errors.length) {
                setValidationErrors(errors);
                return;
            }
        }
        setValidationErrors([]);
        setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
    };
    const handleBack = () => setActiveStep((prev) => Math.max(prev - 1, 0));

    const calculateLoad = () => {
        // Very simplified estimation for placeholder:
        // Q = N1 * Cv * P1 ... (Gas) or Q = N1 * Cv * sqrt(dP/SG) (Liquid)
        // Just return a dummy calculated value based on Cv for now to show the concept.
        // In real app, we'd use the physics engine here.
        // Let's assume 1 Cv ~ 500 kg/h for a placeholder high pressure gas case.
        return displayValues.ratedCv * 500;
    };

    const handleSave = () => {
        const calculatedRate = calculateLoad();
        const startRate = toBase(calculatedRate, 'flow'); // Assuming calc result is in kg/h for now
        const errors = validateValveStep();
        if (errors.length) {
            setValidationErrors(errors);
            return;
        }

        const scenario: Partial<OverpressureScenario> = {
            protectiveSystemId: psvId,
            cause: 'control_valve_failure',
            description: formData.description.replace('[Tag]', formData.cvTag || 'Unknown Tag'),
            phase: formData.phase,
            relievingRate: startRate,
            requiredCapacity: startRate,
            relievingPressure: 0, // Needs PSV set pressure to calc accurately
            assumptions: formData.assumptions,
            isGoverning: false,
            caseConsideration: `## Control Valve Failure
            
### Cause
${formData.description.replace('[Tag]', formData.cvTag || 'Unknown Tag')}

### Valve Parameters
- **Tag**: ${formData.cvTag}
- **Rated Cv**: ${displayValues.ratedCv}
- **Upstream Pressure**: ${displayValues.upstreamPressure} ${preferences.pressure}

### Methodology
Evaluated assuming the control valve fails to the fully open position.
Rate estimated based on rated Cv and maximum upstream pressure.
`,
        };
        onSave(scenario);
        onClose();
        setActiveStep(0);
    };

    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 1 }}>
                        <TextField
                            label="Control Valve Tag"
                            value={formData.cvTag}
                            onChange={(e) => setFormData({ ...formData, cvTag: e.target.value })}
                            fullWidth
                            placeholder="e.g. FV-1001"
                        />

                <TextField
                    label="Rated Cv (Valve Coefficient)"
                    type="number"
                    value={displayValues.ratedCv}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setDisplayValues({ ...displayValues, ratedCv: val });
                        setFormData({ ...formData, ratedCv: val });
                    }}
                    fullWidth
                    helperText="Enter the full open Cv of the valve"
                />

                <TextField
                    label="Max Upstream Pressure (P1)"
                    type="number"
                    value={displayValues.upstreamPressure}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setDisplayValues({ ...displayValues, upstreamPressure: val });
                        setFormData({ ...formData, upstreamPressure: toBase(val, 'pressure') });
                    }}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <TextField
                                    select
                                    variant="standard"
                                    value={preferences.pressure}
                                    onChange={(e) => setUnit('pressure', e.target.value)}
                                    sx={{ minWidth: 60 }}
                                >
                                    {['barg', 'psig', 'kPag'].map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                                </TextField>
                            </InputAdornment>
                        ),
                    }}
                    fullWidth
                />
                        <TextField
                            select
                            label="Fluid Phase"
                            value={formData.phase}
                            onChange={(e) => setFormData({ ...formData, phase: e.target.value as FluidPhase })}
                            fullWidth
                        >
                            <MenuItem value="gas">Gas / Vapor</MenuItem>
                            <MenuItem value="liquid">Liquid</MenuItem>
                            <MenuItem value="steam">Steam</MenuItem>
                        </TextField>
                    </Box>
                );
            case 1:
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 1 }}>
                        <TextField
                            label="Scenario Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            multiline
                            rows={3}
                            fullWidth
                        />
                        <Typography variant="subtitle2" gutterBottom>Assumptions to Include:</Typography>
                        <Box component="ul" sx={{ pl: 2 }}>
                            {formData.assumptions.map((a, i) => (
                                <li key={i}><Typography variant="body2">{a}</Typography></li>
                            ))}
                        </Box>
                    </Box>
                );
            case 2:
                // Calculated preview
                const estimatedLoad = calculateLoad();
                return (
                    <Box sx={{ p: 1 }}>
                        <Typography variant="h6" gutterBottom>Summary</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Scenario</Typography>
                                <Typography variant="body1">CV Failure</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Valve Tag</Typography>
                                <Typography variant="body1">{formData.cvTag || '-'}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Est. Relief Rate</Typography>
                                <Typography variant="body1" fontWeight={600} color="primary.main">
                                    ~{estimatedLoad.toFixed(1)} kg/h
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Rated Cv</Typography>
                                <Typography variant="body1">
                                    {displayValues.ratedCv}
                                </Typography>
                            </Box>
                        </Box>

                        <Alert severity="warning">
                            The estimated relief rate is a placeholder calculation (Cv * 500).
                            You must verify this using the detailed hydraulics calculator or vendor data.
                        </Alert>
                    </Box>
                );
            default:
                return null;
        }
    };

    return (
        <ScenarioWizardLayout
            open={open}
            onClose={onClose}
            title="Control Valve Failure"
            icon={<SettingsIcon color="info" />}
            activeStep={activeStep}
            steps={steps}
            onBack={handleBack}
            onNext={handleNext}
            onSave={handleSave}
            isLastStep={activeStep === steps.length - 1}
            saveLabel="Create Scenario"
            validationAlert={
                validationErrors.length
                    ? { message: validationErrors[0], severity: 'warning' }
                    : undefined
            }
        >
            {renderStepContent()}
        </ScenarioWizardLayout>
    );
}

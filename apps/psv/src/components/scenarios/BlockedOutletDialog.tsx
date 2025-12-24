"use client";

import React, { useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    MenuItem,
    Alert,
} from '@mui/material';
import { UnitSelector } from '../shared/UnitSelector';
import { Block as BlockIcon } from '@mui/icons-material';
import { ScenarioWizardLayout } from './ScenarioWizardLayout';
import { OverpressureScenario, FluidPhase } from '@/data/types';
import { useUnitConversion } from '@/hooks/useUnitConversion';
import { useProjectUnitSystem } from '@/lib/useProjectUnitSystem';
import { getDefaultUnitPreferences } from '@/lib/unitPreferences';
import { getPressureValidationError, getPositiveNumberError } from '@/lib/physicsValidation';

interface BlockedOutletDialogProps {
    open: boolean;
    onClose: () => void;
    psvId: string;
    onSave: (scenario: Partial<OverpressureScenario>) => void;
}

const steps = ['Scenario Basics', 'Source Analysis', 'Review'];

export function BlockedOutletDialog({
    open,
    onClose,
    psvId,
    onSave,
}: BlockedOutletDialogProps) {
    const [activeStep, setActiveStep] = useState(0);
    const { unitSystem } = useProjectUnitSystem();
    const defaultPreferences = getDefaultUnitPreferences(unitSystem);
    const { preferences, setUnit, toDisplay, toBase } = useUnitConversion(defaultPreferences);

    const [formData, setFormData] = useState({
        phase: 'liquid' as FluidPhase,
        description: 'Blocked outlet of [Equipment] due to inadvertent valve closure',
        sourcePressure: 0, // Base unit (Pa)
        normalFlow: 0, // Base unit (kg/h)
        tripPressure: 0, // Base unit (Pa)
        assumptions: [
            'Downstream block valve inadvertently closed',
            'Controller in manual mode or fails to respond',
            'Check valves function correctly',
        ],
    });

    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const handleNext = () => {
        if (activeStep === 1) {
            const errors = validateSourceStep();
            if (errors.length) {
                setValidationErrors(errors);
                return;
            }
        }
        setValidationErrors([]);
        setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
    };
    const handleBack = () => setActiveStep((prev) => Math.max(prev - 1, 0));

    const validateSourceStep = () => {
        const errors: string[] = [];
        const sourcePressureDisp = toDisplay(formData.sourcePressure, 'pressure');
        const sourcePressureError = getPressureValidationError(sourcePressureDisp, preferences.pressure, 'Source pressure');
        if (sourcePressureError) errors.push(sourcePressureError);

        const tripPressureDisp = toDisplay(formData.tripPressure, 'pressure');
        const tripPressureError = getPressureValidationError(tripPressureDisp, preferences.pressure, 'Trip pressure');
        if (tripPressureError) errors.push(tripPressureError);

        const flowDisp = toDisplay(formData.normalFlow, 'flow');
        const flowError = getPositiveNumberError(flowDisp, 'Normal flow');
        if (flowError) errors.push(flowError);
        return errors;
    };

    const handleSave = () => {
        // Simple logic: If source pressure > set pressure (not checked here but assumed), 
        // relief rate is typically the max pump/source flow.
        // We act conservative and set required capacity = normal flow (user should adjust if pump curve known)

        const scenario: Partial<OverpressureScenario> = {
            protectiveSystemId: psvId,
            cause: 'blocked_outlet',
            description: formData.description,
            phase: formData.phase,
            // Assume relief rate matches normal flow for simple blocked outlet (conservative starting point)
            relievingRate: formData.normalFlow,
            requiredCapacity: formData.normalFlow,
            // Relieving pressure is typically Set Pressure + Accumulation, but for the scenario record
            // we often record the Source Pressure available to drive the flow.
            // Let's store 0 for now as it depends on the PSV set pressure which isn't passed in prop here.
            relievingPressure: 0,
            assumptions: formData.assumptions,
            isGoverning: false, // User can toggle later
            caseConsideration: `## Blocked Outlet Analysis
            
### Cause
${formData.description}

### Source Analysis
- **Source Pressure**: ${toDisplay(formData.sourcePressure, 'pressure')} ${preferences.pressure}
- **Normal Flow**: ${toDisplay(formData.normalFlow, 'flow')} ${preferences.flow}
- **Trip Pressure**: ${toDisplay(formData.tripPressure, 'pressure')} ${preferences.pressure}

### Methodology
Evaluated as a blocked outlet case per API-521. 
Required relief rate is taken as the maximum normal flow capability of the upstream source.
`,
        };
        const finalErrors = validateSourceStep();
        if (finalErrors.length) {
            setValidationErrors(finalErrors);
            return;
        }
        onSave(scenario);
        onClose();
        // Reset steps
        setActiveStep(0);
    };

    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 1 }}>
                        <TextField
                            select
                            label="Fluid Phase"
                            value={formData.phase}
                            onChange={(e) => setFormData({ ...formData, phase: e.target.value as FluidPhase })}
                            fullWidth
                            helperText="Select the phase of the fluid at relieving conditions"
                        >
                            <MenuItem value="liquid">Liquid (Hydraulic Blockage)</MenuItem>
                            <MenuItem value="gas">Gas / Vapor</MenuItem>
                            <MenuItem value="two_phase">Two Phase</MenuItem>
                            <MenuItem value="steam">Steam</MenuItem>
                        </TextField>

                        <TextField
                            label="Scenario Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            multiline
                            rows={3}
                            fullWidth
                        />

                        <Alert severity="info">
                            Blocked outlet scenarios occur when a block valve at the outlet of a system is closed,
                            causing pressure to rise to the maximum upstream source pressure.
                        </Alert>
                    </Box>
                );
            case 1:
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Define the upstream source (e.g., Pump, Compressor, or High Pressure Header)
                        </Typography>

                        <UnitSelector
                            label="Max Source Pressure (Deadhead)"
                            value={toDisplay(formData.sourcePressure, 'pressure')}
                            unit={preferences.pressure}
                            availableUnits={['barg', 'psig', 'kPag']}
                            onChange={(val, unit) => {
                                if (unit !== preferences.pressure) setUnit('pressure' as any, unit);
                                setFormData({ ...formData, sourcePressure: toBase(val || 0, 'pressure', unit) });
                            }}
                            fullWidth
                        />

                        <UnitSelector
                            label="Normal Flow Rate"
                            value={toDisplay(formData.normalFlow, 'flow')}
                            unit={preferences.flow}
                            availableUnits={['kg/h', 'lb/h']}
                            onChange={(val, unit) => {
                                if (unit !== preferences.flow) setUnit('flow' as any, unit);
                                setFormData({ ...formData, normalFlow: toBase(val || 0, 'flow', unit) });
                            }}
                            helperText="This will be used as the preliminary required relief rate."
                            fullWidth
                        />

                        <UnitSelector
                            label="High Pressure Trip (PAHH)"
                            value={toDisplay(formData.tripPressure, 'pressure')}
                            unit={preferences.pressure}
                            availableUnits={['barg', 'psig', 'kPag']}
                            onChange={(val, unit) => {
                                if (unit !== preferences.pressure) setUnit('pressure' as any, unit);
                                setFormData({ ...formData, tripPressure: toBase(val || 0, 'pressure', unit) });
                            }}
                            helperText="Credit for trips is usually not taken without SIL analysis (per API-521)."
                            fullWidth
                        />
                    </Box>
                );
            case 2:
                return (
                    <Box sx={{ p: 1 }}>
                        <Typography variant="h6" gutterBottom>Summary</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Scenario</Typography>
                                <Typography variant="body1">Blocked Outlet</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Fluid Phase</Typography>
                                <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>{formData.phase.replace('_', ' ')}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Calculated Rate</Typography>
                                <Typography variant="body1" fontWeight={600} color="primary.main">
                                    {toDisplay(formData.normalFlow, 'flow')} {preferences.flow}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Source Pressure</Typography>
                                <Typography variant="body1">
                                    {toDisplay(formData.sourcePressure, 'pressure')} {preferences.pressure}
                                </Typography>
                            </Box>
                        </Box>

                        <Typography variant="subtitle2" gutterBottom>Generated Assumptions:</Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0 }}>
                            {formData.assumptions.map((a, i) => <li key={i}><Typography variant="body2">{a}</Typography></li>)}
                        </Box>
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
            title="Blocked Outlet Scenario"
            icon={<BlockIcon color="warning" />}
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

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
import { BrokenImage as BrokenImageIcon } from '@mui/icons-material';
import { ScenarioWizardLayout } from './ScenarioWizardLayout';
import { OverpressureScenario, FluidPhase } from '@/data/types';
import { useUnitConversion } from '@/hooks/useUnitConversion';
import { useProjectUnitSystem } from '@/lib/useProjectUnitSystem';
import { getDefaultUnitPreferences } from '@/lib/unitPreferences';
import { getPressureValidationError, getPositiveNumberError } from '@/lib/physicsValidation';

interface TubeRuptureDialogProps {
    open: boolean;
    onClose: () => void;
    psvId: string;
    onSave: (scenario: Partial<OverpressureScenario>) => void;
}

const steps = ['Exchanger Data', 'Pressure Analysis', 'Review'];

export function TubeRuptureDialog({
    open,
    onClose,
    psvId,
    onSave,
}: TubeRuptureDialogProps) {
    const [activeStep, setActiveStep] = useState(0);
    const { unitSystem } = useProjectUnitSystem();
    const defaultPreferences = getDefaultUnitPreferences(unitSystem);
    const { preferences, setUnit, toDisplay, toBase } = useUnitConversion(defaultPreferences);

    const [formData, setFormData] = useState({
        exchangerTag: '',
        hpSide: 'tube' as 'tube' | 'shell',
        hpDesignPressure: 0, // Base unit (Pa)
        lpDesignPressure: 0, // Base unit (Pa)
        lpTestPressure: 0, // Base unit (Pa)
        hpFluidPhase: 'liquid' as FluidPhase,
        holeDiameter: 0, // mm
        useTwoThirdsRule: true, // Check 10/13 rule

        description: 'Tube rupture of heat exchanger [Tag]',
        assumptions: [
            'Sharp edged orifice flow',
            'Full bore rupture of a single tube',
            'No credit for operator intervention',
        ],
    });

    const [displayValues, setDisplayValues] = useState({
        hpDesignPressure: 0,
        lpDesignPressure: 0,
        lpTestPressure: 0,
        holeDiameter: 0,
    });
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const validatePressureStep = () => {
        const errors: string[] = [];
        const hpError = getPressureValidationError(displayValues.hpDesignPressure, preferences.pressure, 'HP design pressure');
        if (hpError) errors.push(hpError);
        const lpError = getPressureValidationError(displayValues.lpDesignPressure, preferences.pressure, 'LP design pressure');
        if (lpError) errors.push(lpError);
        const lpTestError = getPressureValidationError(displayValues.lpTestPressure, preferences.pressure, 'LP test pressure');
        if (lpTestError) errors.push(lpTestError);
        const holeError = getPositiveNumberError(displayValues.holeDiameter, 'Hole diameter');
        if (holeError) errors.push(holeError);
        return errors;
    };

    const handleNext = () => {
        if (activeStep === 1) {
            const errors = validatePressureStep();
            if (errors.length) {
                setValidationErrors(errors);
                return;
            }
        }
        setValidationErrors([]);
        setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
    };
    const handleBack = () => setActiveStep((prev) => Math.max(prev - 1, 0));

    // 10/13 Rule Check (API-521)
    // If LP Test Pressure > (10/13) * HP Design Pressure, tube rupture may be excluded.
    const checkRule = () => {
        if (!formData.useTwoThirdsRule) return { excluded: false, ratio: 0 };
        // Avoid div by zero
        if (formData.hpDesignPressure <= 0) return { excluded: false, ratio: 0 };

        const ratio = formData.lpTestPressure / formData.hpDesignPressure;
        const threshold = 10 / 13; // ~0.77

        return {
            excluded: ratio >= threshold,
            ratio,
            threshold
        };
    };

    const calculateRate = () => {
        // Placeholder orifice calculation
        // Q ~ C * A * sqrt(2 * rho * dP) ... simplified
        // Just return a dummy value based on hole size for now
        // Assume 25mm hole -> ~ 20,000 kg/h for liquid
        const area = Math.PI * Math.pow((displayValues.holeDiameter || 25) / 2 / 1000, 2); // m2
        // Dummy factor
        return area * 10000000;
    };

    const handleSave = () => {
        const errors = validatePressureStep();
        if (errors.length) {
            setValidationErrors(errors);
            return;
        }
        const estRate = calculateRate();

        const scenario: Partial<OverpressureScenario> = {
            protectiveSystemId: psvId,
            cause: 'tube_rupture',
            description: formData.description.replace('[Tag]', formData.exchangerTag || 'E-???'),
            phase: formData.hpFluidPhase,
            relievingRate: estRate,
            requiredCapacity: estRate,
            relievingPressure: 0,
            assumptions: formData.assumptions,
            isGoverning: false,
            caseConsideration: `## Tube Rupture Analysis
            
### Exchanger
- **Tag**: ${formData.exchangerTag}
- **HP Side**: ${formData.hpSide.toUpperCase()}
- **Rupture Size**: ${displayValues.holeDiameter} mm

### Pressure Check (10/13 Rule)
- **HP Design**: ${displayValues.hpDesignPressure} ${preferences.pressure}
- **LP Test**: ${displayValues.lpTestPressure} ${preferences.pressure}
- **Ratio**: ${checkRule().ratio.toFixed(2)} vs 0.77 threshold
- **Conclusion**: ${checkRule().excluded ? 'Case may be EXCLUDED' : 'Case is CREDIBLE'}

### Methodology
Evaluated as a full bore tube rupture scenario.
`,
        };
        onSave(scenario);
        onClose();
        setActiveStep(0);
    };

    const ruleResult = checkRule();

    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 1 }}>
                        <TextField
                            label="Exchanger Tag"
                            value={formData.exchangerTag}
                            onChange={(e) => setFormData({ ...formData, exchangerTag: e.target.value })}
                            placeholder="e.g. E-101"
                            fullWidth
                        />

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                select
                                label="High Pressure Side"
                                value={formData.hpSide}
                                onChange={(e) => setFormData({ ...formData, hpSide: e.target.value as 'tube' | 'shell' })}
                                sx={{ flex: 1 }}
                            >
                                <MenuItem value="tube">Tube Side</MenuItem>
                                <MenuItem value="shell">Shell Side</MenuItem>
                            </TextField>
                            <TextField
                                select
                                label="HP Fluid Phase"
                                value={formData.hpFluidPhase}
                                onChange={(e) => setFormData({ ...formData, hpFluidPhase: e.target.value as FluidPhase })}
                                sx={{ flex: 1 }}
                            >
                                <MenuItem value="liquid">Liquid</MenuItem>
                                <MenuItem value="gas">Gas / Vapor</MenuItem>
                                <MenuItem value="two_phase">Two Phase</MenuItem>
                            </TextField>
                        </Box>

                        <TextField
                            label="Tube Internal Diameter (Rupture Size)"
                            type="number"
                            value={displayValues.holeDiameter}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setDisplayValues({ ...displayValues, holeDiameter: val });
                                setFormData({ ...formData, holeDiameter: val });
                            }}
                            InputProps={{ endAdornment: <InputAdornment position="end">mm</InputAdornment> }}
                            fullWidth
                            helperText="Typically the ID of a single tube"
                        />
                    </Box>
                );
            case 1:
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Enter design pressures to check scenario credibility (API-521 10/13ths rule).
                        </Typography>

                        <TextField
                            label="High Pressure Side Design Pressure"
                            type="number"
                            value={displayValues.hpDesignPressure}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setDisplayValues({ ...displayValues, hpDesignPressure: val });
                                setFormData({ ...formData, hpDesignPressure: toBase(val, 'pressure') });
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
                            label="Low Pressure Side Corrected Hydrotest Pressure"
                            type="number"
                            value={displayValues.lpTestPressure}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setDisplayValues({ ...displayValues, lpTestPressure: val });
                                setFormData({ ...formData, lpTestPressure: toBase(val, 'pressure') });
                            }}
                            InputProps={{ endAdornment: <InputAdornment position="end">{preferences.pressure}</InputAdornment> }}
                            fullWidth
                            helperText="Usually 1.3 or 1.5 x LP Design Pressure"
                        />

                        {ruleResult.excluded ? (
                            <Alert severity="success" variant="outlined">
                                CASE EXCLUDED: LP Test Pressure is &gt; 10/13 of HP Design Pressure.
                                Tube rupture is conventionally considered not credible.
                            </Alert>
                        ) : (
                            <Alert severity="warning" variant="outlined">
                                CASE CREDIBLE: LP Side is vulnerable to overpressure from HP side.
                            </Alert>
                        )}
                    </Box>
                );
            case 2:
                const estRate = calculateRate();
                return (
                    <Box sx={{ p: 1 }}>
                        <Typography variant="h6" gutterBottom>Summary</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Exchanger</Typography>
                                <Typography variant="body1">{formData.exchangerTag || '-'}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Scenario Status</Typography>
                                <Typography variant="body1" color={ruleResult.excluded ? 'success.main' : 'error.main'} fontWeight={600}>
                                    {ruleResult.excluded ? 'Not Credible' : 'Credible'}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Est. Relief Rate</Typography>
                                <Typography variant="body1" fontWeight={600}>
                                    ~{estRate.toFixed(0)} kg/h
                                </Typography>
                            </Box>
                        </Box>

                        <Typography variant="subtitle2" gutterBottom>Assumptions:</Typography>
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
            title="Tube Rupture Analysis"
            icon={<BrokenImageIcon color="error" />}
            activeStep={activeStep}
            steps={steps}
            onBack={handleBack}
            onNext={handleNext}
            onSave={handleSave}
            isLastStep={activeStep === steps.length - 1}
            saveLabel="Create Scenario"
            validationAlert={
                validationErrors.length ? { message: validationErrors[0], severity: 'warning' } : undefined
            }
        >
            {renderStepContent()}
        </ScenarioWizardLayout>
    );
}

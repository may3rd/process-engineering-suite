/**
 * Fire Case Scenario Dialog Component
 * 
 * Supports:
 * - Multiple equipment selection
 * - Unit selection for inputs
 * - Liquid level as length (not percentage)
 * - Auto API-521 or manual input
 */

import React, { useState } from 'react';
import {
    Box,
    Typography,
} from '@mui/material';
import { Calculate as CalculateIcon } from '@mui/icons-material';
import { ScenarioWizardLayout } from './ScenarioWizardLayout';
import { Equipment, VesselDetails, OverpressureScenario } from '@/data/types';
import { MultiEquipmentSelector } from './MultiEquipmentSelector';
import { API521Calculator } from './API521Calculator';
import { ManualRateInput } from './ManualRateInput';
import { FireCalculationResults } from './FireCalculationResults';
import {
    getPressureValidationError,
    getTemperatureValidationError,
    getPositiveNumberError,
    getNonNegativeNumberError,
} from '@/lib/physicsValidation';
import { convertUnit } from '@eng-suite/physics';

interface FireCaseDialogProps {
    open: boolean;
    onClose: () => void;
    psvId: string;
    areaId: string;
    onSave: (scenario: Partial<OverpressureScenario>) => void;
}

type CalculationMethod = 'api521' | 'manual';

interface FireCaseFormData {
    // Equipment selection (multiple)
    selectedEquipment: Equipment[];

    // Calculation method
    calculationMethod: CalculationMethod;

    // API-521 configuration
    api521Config: {
        latentHeat: number | null;
        latentHeatUnit: string;
        relievingTemp: number | null;
        relievingTempUnit: string;
        environmentalFactor: number;
        heightAboveGrade: number | null;
        heightUnit: string;
        // Per-equipment liquid levels - allow empty string for empty inputs
        liquidLevels: Map<string, { value: number | string | null; unit: string }>;
    };

    // Calculation results
    calculationResults?: {
        equipmentResults: Array<{
            equipmentId: string;
            equipmentTag: string;
            wettedArea: number;
            liquidLevel: number;
        }>;
        totalWettedArea: number;
        limitedWettedArea: number;
        heatAbsorption: number;
        reliefRate: number;
        warnings: string[];
    };

    // Manual input
    manualInput: {
        relievingRate: string;
        rateUnit: string;
        relievingTemp: string;
        tempUnit: string;
        relievingPressure: string;
        pressureUnit: string;
        basis: string;
    };

    // Common
    description: string;
    assumptions: string[];
}

const steps = ['Equipment', 'Method', 'Configure', 'Review'];

export function FireCaseDialog({
    open,
    onClose,
    psvId,
    areaId,
    onSave,
}: FireCaseDialogProps) {
    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState<FireCaseFormData>({
        selectedEquipment: [],
        calculationMethod: 'api521',
        api521Config: {
            latentHeat: 420,
            latentHeatUnit: 'kJ/kg',
            relievingTemp: 50,
            relievingTempUnit: '°C',
            environmentalFactor: 1.0,
            heightAboveGrade: 0,
            heightUnit: 'm',
            liquidLevels: new Map(),
        },
        manualInput: {
            relievingRate: '',
            rateUnit: 'kg/h',
            relievingTemp: '',
            tempUnit: '°C',
            relievingPressure: '',
            pressureUnit: 'barg',
            basis: '',
        },
        description: 'External fire exposure',
        assumptions: [],
    });
    const [configureErrors, setConfigureErrors] = useState<string[]>([]);

    const validateConfigureStep = () => {
        const errors: string[] = [];
        if (formData.calculationMethod === 'api521') {
            if (formData.selectedEquipment.length === 0) {
                errors.push('Select at least one equipment before calculating');
            }
            const latentError = getPositiveNumberError(formData.api521Config.latentHeat, 'Latent heat');
            if (latentError) errors.push(latentError);
            const tempError = getTemperatureValidationError(
                formData.api521Config.relievingTemp,
                formData.api521Config.relievingTempUnit,
                'Relieving temperature'
            );
            if (tempError) errors.push(tempError);
            const heightError = getNonNegativeNumberError(
                formData.api521Config.heightAboveGrade,
                'Height above grade'
            );
            if (heightError) errors.push(heightError);
            if (!formData.calculationResults) {
                errors.push('Run the API-521 calculation to compute the relief load');
            }
        } else {
            const rateError = getPositiveNumberError(formData.manualInput.relievingRate, 'Manual relieving rate');
            if (rateError) errors.push(rateError);
            const tempError = getTemperatureValidationError(
                formData.manualInput.relievingTemp,
                formData.manualInput.tempUnit,
                'Manual relieving temperature'
            );
            if (tempError) errors.push(tempError);
            const pressureError = getPressureValidationError(
                formData.manualInput.relievingPressure,
                formData.manualInput.pressureUnit,
                'Manual relieving pressure'
            );
            if (pressureError) errors.push(pressureError);
        }
        return errors;
    };

    const handleNext = () => {
        if (activeStep === 2) {
            const errors = validateConfigureStep();
            if (errors.length) {
                setConfigureErrors(errors);
                return;
            }
        }
        setConfigureErrors([]);
        setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
    };

    const handleBack = () => {
        setActiveStep((prev) => Math.max(prev - 1, 0));
    };

    const handleSave = () => {
        const errors = validateConfigureStep();
        if (errors.length) {
            setConfigureErrors(errors);
            return;
        }
        // Convert to Base Units (C, kg/h, etc) before saving
        // Base units defined in useUnitConversion: Temp='C', Flow='kg/h', Pressure='barg'

        let baseTemp: number;
        if (formData.calculationMethod === 'api521') {
            baseTemp = convertUnit(
                formData.api521Config.relievingTemp ?? 0,
                formData.api521Config.relievingTempUnit,
                'C'
            );
        } else {
            baseTemp = convertUnit(
                parseFloat(formData.manualInput.relievingTemp) || 0,
                formData.manualInput.tempUnit,
                'C'
            );
        }

        let baseRate: number;
        if (formData.calculationMethod === 'api521') {
            // API-521 Calculator returns results in kg/h (Base)
            baseRate = formData.calculationResults?.reliefRate || 0;
        } else {
            baseRate = convertUnit(
                parseFloat(formData.manualInput.relievingRate) || 0,
                formData.manualInput.rateUnit,
                'kg/h'
            );
        }

        let basePressure: number | undefined;
        if (formData.calculationMethod === 'manual') {
            basePressure = convertUnit(
                parseFloat(formData.manualInput.relievingPressure) || 0,
                formData.manualInput.pressureUnit,
                'barg'
            );
        }

        const scenario: Partial<OverpressureScenario> = {
            protectiveSystemId: psvId,
            cause: 'fire_case',
            description: formData.description,
            relievingTemp: baseTemp,
            relievingRate: baseRate,
            relievingPressure: basePressure,
            accumulationPct: 21, // API-521 allows 21% accumulation for fire case
        };

        onSave(scenario);
        onClose();
    };

    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <MultiEquipmentSelector
                        areaId={areaId}
                        selectedEquipment={formData.selectedEquipment}
                        onChange={(equipment) =>
                            setFormData({ ...formData, selectedEquipment: equipment })
                        }
                    />
                );

            case 1:
                return (
                    <Box sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Calculation Method
                        </Typography>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Choose how to determine the required relief rate for fire exposure.
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box
                                onClick={() => setFormData({ ...formData, calculationMethod: 'api521' })}
                                sx={{
                                    p: 3,
                                    borderRadius: 2,
                                    border: 2,
                                    borderColor: formData.calculationMethod === 'api521' ? 'primary.main' : 'divider',
                                    cursor: 'pointer',
                                    bgcolor: formData.calculationMethod === 'api521'
                                        ? (theme) => theme.palette.mode === 'dark'
                                            ? 'rgba(25, 118, 210, 0.1)'
                                            : 'rgba(25, 118, 210, 0.05)'
                                        : 'transparent',
                                    '&:hover': { bgcolor: 'action.hover' },
                                    transition: 'all 0.2s',
                                }}
                            >
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    🔥 API-521 Automatic Calculation
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Calculate relief rate using API-521 fire exposure methodology. Configure
                                    environmental factors, liquid levels, and fluid properties.
                                </Typography>
                                <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
                                    ✓ Wetted area calculation<br />
                                    ✓ Heat absorption per API-521<br />
                                    ✓ Environmental factor credits
                                </Typography>
                            </Box>

                            <Box
                                onClick={() => setFormData({ ...formData, calculationMethod: 'manual' })}
                                sx={{
                                    p: 3,
                                    borderRadius: 2,
                                    border: 2,
                                    borderColor: formData.calculationMethod === 'manual' ? 'primary.main' : 'divider',
                                    cursor: 'pointer',
                                    bgcolor: formData.calculationMethod === 'manual'
                                        ? (theme) => theme.palette.mode === 'dark'
                                            ? 'rgba(25, 118, 210, 0.1)'
                                            : 'rgba(25, 118, 210, 0.05)'
                                        : 'transparent',
                                    '&:hover': { bgcolor: 'action.hover' },
                                    transition: 'all 0.2s',
                                }}
                            >
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    ✏️ Manual Rate Input
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Enter relief rate directly if calculated externally or from previous studies.
                                    Requires detailed basis of calculation.
                                </Typography>
                                <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
                                    ✓ Direct rate entry<br />
                                    ✓ Basis documentation<br />
                                    ✓ Vendor calculations
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                );

            case 2:
                return formData.calculationMethod === 'api521' ? (
                    <API521Calculator
                        equipment={formData.selectedEquipment}
                        config={formData.api521Config}
                        onChange={(config, results) =>
                            setFormData({
                                ...formData,
                                api521Config: config,
                                calculationResults: results
                            })
                        }
                    />
                ) : (
                    <ManualRateInput
                        input={formData.manualInput}
                        onChange={(input) =>
                            setFormData({ ...formData, manualInput: input })
                        }
                    />
                );

            case 3:
                return (
                    <FireCalculationResults
                        equipment={formData.selectedEquipment}
                        results={formData.calculationResults}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <ScenarioWizardLayout
            open={open}
            onClose={onClose}
            title="Fire Case Scenario"
            icon={<CalculateIcon color="primary" />}
            activeStep={activeStep}
            steps={steps}
            onBack={handleBack}
            onNext={handleNext}
            onSave={handleSave}
            isLastStep={activeStep === steps.length - 1}
            saveLabel="Save Scenario"
            validationAlert={
                configureErrors.length
                    ? { message: configureErrors[0], severity: 'warning' }
                    : undefined
            }
        >
            {renderStepContent()}
        </ScenarioWizardLayout>
    );
}

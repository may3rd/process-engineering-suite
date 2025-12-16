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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Stepper,
    Step,
    StepLabel,
    Alert,
    IconButton,
} from '@mui/material';
import { Close as CloseIcon, Calculate as CalculateIcon } from '@mui/icons-material';
import { Equipment, VesselDetails, OverpressureScenario } from '@/data/types';
import { MultiEquipmentSelector } from './MultiEquipmentSelector';
import { API521Calculator } from './API521Calculator';
import { ManualRateInput } from './ManualRateInput';
import { FireCalculationResults } from './FireCalculationResults';

interface FireCaseScenarioDialogProps {
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
        latentHeat: number;
        latentHeatUnit: string;
        relievingTemp: number;
        relievingTempUnit: string;
        environmentalFactor: number;
        heightAboveGrade: number;
        heightUnit: string;
        // Per-equipment liquid levels
        liquidLevels: Map<string, { value: number; unit: string }>;
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
        relievingRate: number;
        rateUnit: string;
        relievingTemp: number;
        tempUnit: string;
        relievingPressure: number;
        pressureUnit: string;
        basis: string;
    };

    // Common
    description: string;
    assumptions: string[];
}

const steps = ['Equipment', 'Method', 'Configure', 'Review'];

export function FireCaseScenarioDialog({
    open,
    onClose,
    psvId,
    areaId,
    onSave,
}: FireCaseScenarioDialogProps) {
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
            relievingRate: 0,
            rateUnit: 'kg/h',
            relievingTemp: 50,
            tempUnit: '°C',
            relievingPressure: 17.5,
            pressureUnit: 'barg',
            basis: '',
        },
        description: 'External fire exposure',
        assumptions: [],
    });

    const handleNext = () => {
        setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
    };

    const handleBack = () => {
        setActiveStep((prev) => Math.max(prev - 1, 0));
    };

    const handleSave = () => {
        const scenario: Partial<OverpressureScenario> = {
            protectiveSystemId: psvId,
            cause: 'fire_case',
            description: formData.description,
            relievingTemp: formData.calculationMethod === 'api521'
                ? formData.api521Config.relievingTemp
                : formData.manualInput.relievingTemp,
            relievingRate: formData.calculationMethod === 'api521'
                ? formData.calculationResults?.reliefRate || 0
                : formData.manualInput.relievingRate,
            // ... other fields
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
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    background: (theme) =>
                        theme.palette.mode === 'dark'
                            ? 'rgba(18, 18, 18, 0.95)'
                            : 'rgba(255, 255, 255, 0.98)',
                    backdropFilter: 'blur(20px)',
                },
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalculateIcon color="primary" />
                    <Typography variant="h6">Fire Case Scenario</Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ minHeight: 500 }}>
                <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {renderStepContent()}
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button onClick={onClose}>Cancel</Button>
                <Box sx={{ flex: 1 }} />
                {activeStep > 0 && (
                    <Button onClick={handleBack}>Back</Button>
                )}
                {activeStep < steps.length - 1 && (
                    <Button variant="contained" onClick={handleNext}>
                        Next
                    </Button>
                )}
                {activeStep === steps.length - 1 && (
                    <Button variant="contained" onClick={handleSave}>
                        Save Scenario
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}

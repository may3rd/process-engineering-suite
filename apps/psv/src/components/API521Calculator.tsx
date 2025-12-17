/**
 * API-521 Fire Exposure Calculator Component
 * 
 * Features:
 * - Unit selection for all inputs
 * - Liquid level as length (not percentage)
 * - Per-equipment configuration
 * - Automatic wetted area calculation
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    Stack,
    TextField,
    MenuItem,
    Typography,
    Alert,
    Button,
    Card,
    CardContent,
    FormControl,
    InputLabel,
    Select,
    RadioGroup,
    Radio,
    FormControlLabel,
    Slider,
    Divider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Calculate as CalculateIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import { UnitSelector } from '@/components/shared';
import { Equipment, VesselDetails, TankDetails } from '@/data/types';
import { convertUnit } from '@eng-suite/physics';
import { calculateFireExposureArea, type VesselCalculationInput } from '@/lib/vesselCalculations';
import {
    calculateAPI521FireLoad,
    ENVIRONMENTAL_FACTORS,
    validateFireSizingInputs,
} from '@/lib/api521';

interface API521CalculatorProps {
    equipment: Equipment[];
    config: {
        latentHeat: number;
        latentHeatUnit: string;
        relievingTemp: number;
        relievingTempUnit: string;
        environmentalFactor: number;
        heightAboveGrade: number;
        heightUnit: string;
        // Per-equipment liquid levels - allow empty string for empty inputs
        liquidLevels: Map<string, { value: number | string; unit: string }>;
    };
    onChange: (config: any, results?: any) => void;
}

export function API521Calculator({ equipment, config, onChange }: API521CalculatorProps) {
    const [localConfig, setLocalConfig] = useState(config);
    const [results, setResults] = useState<any>(null);
    const [errors, setErrors] = useState<string[]>([]);

    const updateConfig = (updates: Partial<typeof config>) => {
        const newConfig = { ...localConfig, ...updates };
        setLocalConfig(newConfig);
        onChange(newConfig, results);
    };

    const handleCalculate = async () => {
        try {
            setErrors([]);

            // Convert all units to SI
            const latentHeatSI = convertUnit(
                localConfig.latentHeat,
                localConfig.latentHeatUnit,
                'kJ/kg'
            );

            const heightSI = convertUnit(
                localConfig.heightAboveGrade,
                localConfig.heightUnit,
                'm'
            );

            // Calculate wetted area for each equipment
            const equipmentResults = [];
            let totalWettedArea = 0;

            for (const eq of equipment) {
                const details = eq.details as VesselDetails | TankDetails;
                if (!details) continue;

                const liquidLevelConfig = localConfig.liquidLevels.get(eq.id) || {
                    value: 0,
                    unit: 'm',
                };

                // Convert liquid level to meters (treat empty/invalid as 0)
                const liquidLevelValue = typeof liquidLevelConfig.value === 'string'
                    ? parseFloat(liquidLevelConfig.value) || 0
                    : liquidLevelConfig.value || 0;

                const liquidLevelM = convertUnit(
                    liquidLevelValue,
                    liquidLevelConfig.unit,
                    'm'
                );

                // Determine vessel type
                const vesselType = getVesselType(eq, details);

                // Calculate wetted area
                const wettedArea = calculateFireExposureArea(
                    {
                        vesselType: vesselType as VesselCalculationInput['vesselType'],
                        diameter: details.innerDiameter / 1000, // mm to m
                        length: 'tangentToTangentLength' in details
                            ? details.tangentToTangentLength / 1000
                            : details.height / 1000,
                        liquidLevel: liquidLevelM,
                    },
                    details.insulated || false
                );

                equipmentResults.push({
                    equipmentId: eq.id,
                    equipmentTag: eq.tag,
                    wettedArea,
                    liquidLevel: liquidLevelM,
                });

                totalWettedArea += wettedArea;
            }

            // Validate inputs
            const validation = validateFireSizingInputs(
                totalWettedArea,
                latentHeatSI,
                localConfig.environmentalFactor
            );

            if (!validation.valid) {
                setErrors(validation.errors);
                return;
            }

            // Calculate fire relief load
            const fireLoad = calculateAPI521FireLoad(
                totalWettedArea,
                latentHeatSI,
                localConfig.environmentalFactor,
                heightSI
            );

            const calculationResults = {
                equipmentResults,
                totalWettedArea,
                limitedWettedArea: fireLoad.limitedWettedArea,
                heatAbsorption: fireLoad.heatAbsorption / 1000, // W to kW
                reliefRate: fireLoad.reliefRate, // kg/h
                warnings: validation.errors,
            };

            setResults(calculationResults);
            onChange(localConfig, calculationResults);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setErrors([`Calculation error: ${errorMessage}`]);
        }
    };

    const getVesselType = (eq: Equipment, details: VesselDetails | TankDetails): string => {
        const orientation = 'orientation' in details ? details.orientation : 'vertical';
        const headType = 'headType' in details ? details.headType : 'torispherical';

        return `${orientation}-${headType}`;
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                API-521 Fire Exposure Calculation
            </Typography>

            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                Configure fire protection and fluid properties for automatic relief rate calculation
                per API-521 Section 4.4
            </Alert>



            {/* Fluid Properties */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        🌡️ Fluid Properties
                    </Typography>

                    <Stack spacing={3}>
                        <UnitSelector
                            label="Latent Heat of Vaporization"
                            value={localConfig.latentHeat}
                            unit={localConfig.latentHeatUnit}
                            availableUnits={['kJ/kg', 'Btu/lb', 'kcal/kg']}
                            onChange={(val, unit) =>
                                updateConfig({
                                    latentHeat: val || 0,
                                    latentHeatUnit: unit,
                                })
                            }
                            required
                            helperText="Typical: Water 2260, Propane 420, LPG 350-450"
                        />

                        <UnitSelector
                            label="Relieving Temperature"
                            value={localConfig.relievingTemp}
                            unit={localConfig.relievingTempUnit}
                            availableUnits={['°C', '°F', 'K']}
                            onChange={(val, unit) =>
                                updateConfig({
                                    relievingTemp: val || 0,
                                    relievingTempUnit: unit,
                                })
                            }
                            required
                        />
                    </Stack>
                </CardContent>
            </Card>

            {/* Fire Protection */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        🛡️ Fire Protection Configuration
                    </Typography>

                    <FormControl component="fieldset">
                        <RadioGroup
                            value={localConfig.environmentalFactor}
                            onChange={(e) =>
                                updateConfig({
                                    environmentalFactor: parseFloat(e.target.value),
                                })
                            }
                        >
                            <FormControlLabel
                                value={ENVIRONMENTAL_FACTORS.BARE}
                                control={<Radio />}
                                label="Bare Vessel (F = 1.0) - No protection"
                            />
                            <FormControlLabel
                                value={ENVIRONMENTAL_FACTORS.INSULATED}
                                control={<Radio />}
                                label="Insulated (F = 0.3) - 50-100mm insulation"
                            />
                            <FormControlLabel
                                value={ENVIRONMENTAL_FACTORS.WATER_SPRAY}
                                control={<Radio />}
                                label="Water Spray (F = 0.15) - Deluge system"
                            />
                            <FormControlLabel
                                value={ENVIRONMENTAL_FACTORS.INSULATED_WITH_WATER}
                                control={<Radio />}
                                label="Insulated + Water Spray (F = 0.075)"
                            />
                        </RadioGroup>
                    </FormControl>

                    <Box sx={{ mt: 2 }}>
                        <UnitSelector
                            label="Height Above Grade"
                            value={localConfig.heightAboveGrade}
                            unit={localConfig.heightUnit}
                            availableUnits={['m', 'ft']}
                            onChange={(val, unit) =>
                                updateConfig({
                                    heightAboveGrade: val || 0,
                                    heightUnit: unit,
                                })
                            }
                            required
                            helperText="API-521 limits wetted area to 7.6m (25 ft) above grade"
                        />
                    </Box>
                </CardContent>
            </Card>

            {/* Per-Equipment Liquid Levels */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        📊 Liquid Levels
                    </Typography>

                    {equipment.map((eq) => {
                        const liquidLevel = localConfig.liquidLevels.get(eq.id) || {
                            value: 0,
                            unit: 'm',
                        };

                        // Calculate quick wetted area for real-time display
                        const calculateQuickWettedArea = (): number | null => {
                            try {
                                const details = eq.details as VesselDetails | TankDetails;

                                // Convert liquid level to number (treat empty/invalid as 0)
                                const liquidLevelValue = typeof liquidLevel.value === 'string'
                                    ? parseFloat(liquidLevel.value) || 0
                                    : liquidLevel.value || 0;

                                if (!details || liquidLevelValue <= 0) return null;

                                // Convert liquid level to meters
                                const liquidLevelM = convertUnit(
                                    liquidLevelValue,
                                    liquidLevel.unit,
                                    'm'
                                );

                                // Determine vessel type
                                const vesselType = getVesselType(eq, details);

                                // Calculate wetted area
                                const wettedArea = calculateFireExposureArea(
                                    {
                                        vesselType: vesselType as VesselCalculationInput['vesselType'],
                                        diameter: details.innerDiameter / 1000, // mm to m
                                        length: 'tangentToTangentLength' in details
                                            ? details.tangentToTangentLength / 1000
                                            : details.height / 1000,
                                        liquidLevel: liquidLevelM,
                                    },
                                    details.insulated || false
                                );

                                return wettedArea;
                            } catch (error) {
                                return null;
                            }
                        };

                        const quickWettedArea = calculateQuickWettedArea();

                        return (
                            <Accordion key={eq.id} sx={{ mb: 1 }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography>{eq.tag} - {eq.name}</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Stack spacing={2}>
                                        <UnitSelector
                                            label="Normal Liquid Level"
                                            value={typeof liquidLevel.value === 'string' ? parseFloat(liquidLevel.value) || 0 : liquidLevel.value}
                                            unit={liquidLevel.unit}
                                            availableUnits={['m', 'ft', 'mm', 'in']}
                                            onChange={(val, unit) => {
                                                const newLevels = new Map(localConfig.liquidLevels);
                                                newLevels.set(eq.id, {
                                                    value: val || 0,
                                                    unit: unit,
                                                });
                                                updateConfig({ liquidLevels: newLevels });
                                            }}
                                            required
                                            helperText="Height from bottom of vessel"
                                        />

                                        {/* Real-time wetted area display */}
                                        {quickWettedArea !== null && (
                                            <Box
                                                sx={{
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    bgcolor: (theme) =>
                                                        theme.palette.mode === 'dark'
                                                            ? 'rgba(56, 189, 248, 0.1)'
                                                            : 'rgba(56, 189, 248, 0.05)',
                                                    border: 1,
                                                    borderColor: (theme) =>
                                                        theme.palette.mode === 'dark'
                                                            ? 'rgba(56, 189, 248, 0.3)'
                                                            : 'rgba(56, 189, 248, 0.2)',
                                                }}
                                            >
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Typography variant="caption" color="text.secondary">
                                                        💧 Wetted Area:
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={600}
                                                        sx={{
                                                            color: (theme) =>
                                                                theme.palette.mode === 'dark'
                                                                    ? '#38bdf8'
                                                                    : '#0284c7',
                                                        }}
                                                    >
                                                        {quickWettedArea.toFixed(2)} m²
                                                    </Typography>
                                                    {quickWettedArea > 2800 && (
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: 'warning.main',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 0.5,
                                                            }}
                                                        >
                                                            ⚠️ Exceeds API-521 limit
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            </Box>
                                        )}
                                    </Stack>
                                </AccordionDetails>
                            </Accordion>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Error Display */}
            {errors.length > 0 && (
                <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 3, borderRadius: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Validation Errors:
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {errors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                </Alert>
            )}

            {/* Calculate Button */}
            <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<CalculateIcon />}
                onClick={handleCalculate}
                disabled={equipment.length === 0}
                sx={{ borderRadius: 2, py: 1.5 }}
            >
                Calculate Fire Relief Load
            </Button>
        </Box>
    );
}

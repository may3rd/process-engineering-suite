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
    FormControlRadio,
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
import { Equipment, VesselDetails, TankDetails } from '@/data/types';
import { convertUnit } from '@eng-suite/physics';
import { calculateFireExposureArea } from '@/lib/vesselCalculations';
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
        liquidLevels: Map<string, { value: number; unit: string }>;
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

                // Convert liquid level to meters
                const liquidLevelM = convertUnit(
                    liquidLevelConfig.value,
                    liquidLevelConfig.unit,
                    'm'
                );

                // Determine vessel type
                const vesselType = getVesselType(eq, details);

                // Calculate wetted area
                const wettedArea = calculateFireExposureArea(
                    {
                        vesselType,
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
            setErrors([`Calculation error: ${error.message}`]);
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
                        <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Latent Heat of Vaporization
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                <TextField
                                    required
                                    type="number"
                                    value={localConfig.latentHeat}
                                    onChange={(e) =>
                                        updateConfig({ latentHeat: parseFloat(e.target.value) })
                                    }
                                    helperText="Typical: Water 2260, Propane 420, LPG 350-450"
                                    sx={{ flex: 1 }}
                                    size="small"
                                />
                                <Select
                                    value={localConfig.latentHeatUnit}
                                    onChange={(e) =>
                                        updateConfig({ latentHeatUnit: e.target.value })
                                    }
                                    size="small"
                                    sx={{ minWidth: 100 }}
                                >
                                    <MenuItem value="kJ/kg">kJ/kg</MenuItem>
                                    <MenuItem value="Btu/lb">Btu/lb</MenuItem>
                                    <MenuItem value="kcal/kg">kcal/kg</MenuItem>
                                </Select>
                            </Stack>
                        </Box>

                        <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Relieving Temperature
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <TextField
                                    required
                                    type="number"
                                    value={localConfig.relievingTemp}
                                    onChange={(e) =>
                                        updateConfig({ relievingTemp: parseFloat(e.target.value) })
                                    }
                                    sx={{ flex: 1 }}
                                    size="small"
                                />
                                <Select
                                    value={localConfig.relievingTempUnit}
                                    onChange={(e) =>
                                        updateConfig({ relievingTempUnit: e.target.value })
                                    }
                                    size="small"
                                    sx={{ minWidth: 80 }}
                                >
                                    <MenuItem value="°C">°C</MenuItem>
                                    <MenuItem value="°F">°F</MenuItem>
                                    <MenuItem value="K">K</MenuItem>
                                </Select>
                            </Stack>
                        </Box>
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
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Height Above Grade
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                            <TextField
                                required
                                type="number"
                                value={localConfig.heightAboveGrade}
                                onChange={(e) =>
                                    updateConfig({ heightAboveGrade: parseFloat(e.target.value) })
                                }
                                helperText="API-521 limits wetted area to 7.6m (25 ft) above grade"
                                sx={{ flex: 1 }}
                                size="small"
                            />
                            <Select
                                value={localConfig.heightUnit}
                                onChange={(e) => updateConfig({ heightUnit: e.target.value })}
                                size="small"
                                sx={{ minWidth: 80 }}
                            >
                                <MenuItem value="m">m</MenuItem>
                                <MenuItem value="ft">ft</MenuItem>
                            </Select>
                        </Stack>
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

                        return (
                            <Accordion key={eq.id} sx={{ mb: 1 }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography>{eq.tag} - {eq.name}</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Normal Liquid Level
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="flex-start">
                                            <TextField
                                                required
                                                type="number"
                                                value={liquidLevel.value}
                                                onChange={(e) => {
                                                    const newLevels = new Map(localConfig.liquidLevels);
                                                    newLevels.set(eq.id, {
                                                        ...liquidLevel,
                                                        value: parseFloat(e.target.value),
                                                    });
                                                    updateConfig({ liquidLevels: newLevels });
                                                }}
                                                helperText="Height from bottom of vessel"
                                                sx={{ flex: 1 }}
                                                size="small"
                                            />
                                            <Select
                                                value={liquidLevel.unit}
                                                onChange={(e) => {
                                                    const newLevels = new Map(localConfig.liquidLevels);
                                                    newLevels.set(eq.id, {
                                                        ...liquidLevel,
                                                        unit: e.target.value,
                                                    });
                                                    updateConfig({ liquidLevels: newLevels });
                                                }}
                                                size="small"
                                                sx={{ minWidth: 80 }}
                                            >
                                                <MenuItem value="m">m</MenuItem>
                                                <MenuItem value="ft">ft</MenuItem>
                                                <MenuItem value="mm">mm</MenuItem>
                                                <MenuItem value="in">in</MenuItem>
                                            </Select>
                                        </Stack>
                                    </Box>
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

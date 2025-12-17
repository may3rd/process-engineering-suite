/**
 * Manual Rate Input Component
 * 
 * For users who want to directly specify relief rate
 * instead of using automatic API-521 calculation
 */

import React from 'react';
import {
    Box,
    TextField,
    MenuItem,
    Typography,
    Select,
    Card,
    CardContent,
    Stack,
    Alert,
} from '@mui/material';
import {
    getPressureValidationError,
    getTemperatureValidationError,
    getPositiveNumberError,
} from '@/lib/physicsValidation';

interface ManualRateInputProps {
    input: {
        relievingRate: string;
        rateUnit: string;
        relievingTemp: string;
        tempUnit: string;
        relievingPressure: string;
        pressureUnit: string;
        basis: string;
    };
    onChange: (input: any) => void;
}

export function ManualRateInput({ input, onChange }: ManualRateInputProps) {
    const updateInput = (updates: Partial<typeof input>) => {
        onChange({ ...input, ...updates });
    };

    const rateErrorMessage = getPositiveNumberError(input.relievingRate, "Relief rate");
    const pressureErrorMessage = getPressureValidationError(input.relievingPressure, input.pressureUnit, "Relieving pressure");
    const temperatureErrorMessage = getTemperatureValidationError(input.relievingTemp, input.tempUnit, "Relieving temperature");

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                ✏️ Manual Relief Rate Input
            </Typography>

            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                Specify the relief rate directly if calculated externally or documented from
                previous studies. Include basis of calculation for reference.
            </Alert>

            {/* Relieving Rate */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Relief Conditions
                    </Typography>

                    <Stack spacing={3}>
                        <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Relieving Rate
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <TextField
                                    required
                                    type="number"
                                    value={input.relievingRate}
                                    onChange={(e) =>
                                        updateInput({ relievingRate: e.target.value })
                                    }
                                    error={!!rateErrorMessage}
                                    helperText={rateErrorMessage || ''}
                                    sx={{ flex: 1 }}
                                    size="small"
                                />
                                <Select
                                    value={input.rateUnit}
                                    onChange={(e) => updateInput({ rateUnit: e.target.value })}
                                    size="small"
                                    sx={{ minWidth: 100 }}
                                >
                                    <MenuItem value="kg/h">kg/h</MenuItem>
                                    <MenuItem value="lb/h">lb/h</MenuItem>
                                    <MenuItem value="kg/s">kg/s</MenuItem>
                                    <MenuItem value="ton/day">ton/day</MenuItem>
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
                                    value={input.relievingTemp}
                                    onChange={(e) =>
                                        updateInput({ relievingTemp: e.target.value })
                                    }
                                    error={!!temperatureErrorMessage}
                                    helperText={temperatureErrorMessage || ''}
                                    sx={{ flex: 1 }}
                                    size="small"
                                />
                                <Select
                                    value={input.tempUnit}
                                    onChange={(e) => updateInput({ tempUnit: e.target.value })}
                                    size="small"
                                    sx={{ minWidth: 80 }}
                                >
                                    <MenuItem value="°C">°C</MenuItem>
                                    <MenuItem value="°F">°F</MenuItem>
                                    <MenuItem value="K">K</MenuItem>
                                </Select>
                            </Stack>
                        </Box>

                        <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Relieving Pressure
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <TextField
                                    required
                                    type="number"
                                    value={input.relievingPressure}
                                    onChange={(e) =>
                                        updateInput({ relievingPressure: e.target.value })
                                    }
                                    error={!!pressureErrorMessage}
                                    helperText={pressureErrorMessage || "Set pressure + accumulation"}
                                    sx={{ flex: 1 }}
                                    size="small"
                                />
                                <Select
                                    value={input.pressureUnit}
                                    onChange={(e) => updateInput({ pressureUnit: e.target.value })}
                                    size="small"
                                    sx={{ minWidth: 100 }}
                                >
                                    <MenuItem value="barg">barg</MenuItem>
                                    <MenuItem value="psig">psig</MenuItem>
                                    <MenuItem value="kPag">kPag</MenuItem>
                                    <MenuItem value="bar">bar (abs)</MenuItem>
                                    <MenuItem value="psia">psia</MenuItem>
                                </Select>
                            </Stack>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>

            {/* Basis of Calculation */}
            <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Basis of Calculation
                    </Typography>

                    <TextField
                        fullWidth
                        required
                        multiline
                        rows={6}
                        label="Calculation Basis / Reference"
                        value={input.basis}
                        onChange={(e) => updateInput({ basis: e.target.value })}
                        placeholder="Describe how this relief rate was determined (e.g., API-521 with F=0.3, wetted area 150m², previous vendor calculation, etc.)"
                        error={input.basis.length < 20}
                        helperText={
                            input.basis.length < 20
                                ? `Provide detailed basis (${input.basis.length}/20 min chars)`
                                : 'Include calculation method, assumptions, and references'
                        }
                    />
                </CardContent>
            </Card>
        </Box>
    );
}

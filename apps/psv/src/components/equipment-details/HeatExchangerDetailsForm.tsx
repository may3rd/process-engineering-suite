import React from 'react';
import {
    Box,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Typography,
    Grid,
} from '@mui/material';
import { HeatExchangerDetails } from '@/data/types';
import { UnitSelector } from '../shared';
import { useUnitDetails, UNITS } from './hooks';

interface HeatExchangerDetailsFormProps {
    details: HeatExchangerDetails | null;
    onChange: (details: HeatExchangerDetails) => void;
}

export function HeatExchangerDetailsForm({ details, onChange }: HeatExchangerDetailsFormProps) {
    const { getUnit, handleUnitChange, getDisplayValue } = useUnitDetails();

    const handleChange = (field: keyof HeatExchangerDetails, value: any) => {
        onChange({
            ...details,
            hxType: details?.hxType || 'shell_tube',
            [field]: value
        } as HeatExchangerDetails);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" color="primary">Exchanger Details</Typography>

            <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Type</InputLabel>
                        <Select
                            value={details?.hxType || 'shell_tube'}
                            label="Type"
                            onChange={(e) => handleChange('hxType', e.target.value)}
                        >
                            <MenuItem value="shell_tube">Shell & Tube</MenuItem>
                            <MenuItem value="plate">Plate & Frame</MenuItem>
                            <MenuItem value="air_cooler">Air Cooler</MenuItem>
                            <MenuItem value="double_pipe">Double Pipe</MenuItem>
                            <MenuItem value="spiral">Spiral</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <UnitSelector
                        label="Heat Duty"
                        value={getDisplayValue(details?.heatDuty, 'heatDuty', 'kW', 'kW')}
                        unit={getUnit('heatDuty', 'kW')}
                        availableUnits={UNITS.POWER}
                        onChange={(val, unit) => handleUnitChange('heatDuty', val, unit, 'kW', details, onChange)}
                    />
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <UnitSelector
                        label="Transfer Area"
                        value={getDisplayValue(details?.heatTransferArea, 'heatTransferArea', 'm²', 'm²')}
                        unit={getUnit('heatTransferArea', 'm²')}
                        availableUnits={UNITS.AREA}
                        onChange={(val, unit) => handleUnitChange('heatTransferArea', val, unit, 'm²', details, onChange)}
                    />
                </Grid>

                {details?.hxType === 'shell_tube' && (
                    <>
                        <Grid size={{ xs: 6 }}>
                            <UnitSelector
                                label="Shell Diameter"
                                value={getDisplayValue(details?.shellDiameter, 'shellDiameter', 'mm', 'mm')}
                                unit={getUnit('shellDiameter', 'mm')}
                                availableUnits={UNITS.LENGTH}
                                onChange={(val, unit) => handleUnitChange('shellDiameter', val, unit, 'mm', details, onChange)}
                            />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <UnitSelector
                                label="Tube Length"
                                value={getDisplayValue(details?.tubeLength, 'tubeLength', 'mm', 'mm')}
                                unit={getUnit('tubeLength', 'mm')}
                                availableUnits={UNITS.LENGTH}
                                onChange={(val, unit) => handleUnitChange('tubeLength', val, unit, 'mm', details, onChange)}
                            />
                        </Grid>
                    </>
                )}
            </Grid>
        </Box>
    );
}

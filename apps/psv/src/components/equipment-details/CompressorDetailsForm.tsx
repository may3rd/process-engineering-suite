import React from 'react';
import {
    Box,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Typography,
    Grid,
    InputAdornment
} from '@mui/material';
import { CompressorDetails } from '@/data/types';
import { UnitSelector } from '../shared';
import { useUnitDetails, UNITS } from './hooks';

interface CompressorDetailsFormProps {
    details: CompressorDetails | null;
    onChange: (details: CompressorDetails) => void;
}

export function CompressorDetailsForm({ details, onChange }: CompressorDetailsFormProps) {
    const { getUnit, handleUnitChange, getDisplayValue } = useUnitDetails();

    const handleChange = (field: keyof CompressorDetails, value: any) => {
        onChange({
            ...details,
            compressorType: details?.compressorType || 'centrifugal',
            ratedCapacity: details?.ratedCapacity || 0,
            suctionPressure: details?.suctionPressure || 0,
            dischargePressure: details?.dischargePressure || 0,
            [field]: value
        } as CompressorDetails);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" color="primary">Compressor Specification</Typography>

            <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Type</InputLabel>
                        <Select
                            value={details?.compressorType || 'centrifugal'}
                            label="Type"
                            onChange={(e) => handleChange('compressorType', e.target.value)}
                        >
                            <MenuItem value="centrifugal">Centrifugal</MenuItem>
                            <MenuItem value="reciprocating">Reciprocating</MenuItem>
                            <MenuItem value="screw">Screw</MenuItem>
                            <MenuItem value="axial">Axial</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <UnitSelector
                        label="Rated Capacity"
                        value={getDisplayValue(details?.ratedCapacity, 'ratedCapacity', 'm3/h', 'm3/h')}
                        unit={getUnit('ratedCapacity', 'm3/h')}
                        availableUnits={UNITS.FLOW_RATE}
                        onChange={(val, unit) => handleUnitChange('ratedCapacity', val, unit, 'm3/h', details, onChange)}
                    />
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <UnitSelector
                        label="Suction P"
                        value={getDisplayValue(details?.suctionPressure, 'suctionPressure', 'barg', 'barg')}
                        unit={getUnit('suctionPressure', 'barg')}
                        availableUnits={UNITS.PRESSURE}
                        onChange={(val, unit) => handleUnitChange('suctionPressure', val, unit, 'barg', details, onChange)}
                    />
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <UnitSelector
                        label="Discharge P"
                        value={getDisplayValue(details?.dischargePressure, 'dischargePressure', 'barg', 'barg')}
                        unit={getUnit('dischargePressure', 'barg')}
                        availableUnits={UNITS.PRESSURE}
                        onChange={(val, unit) => handleUnitChange('dischargePressure', val, unit, 'barg', details, onChange)}
                    />
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <UnitSelector
                        label="Power"
                        value={getDisplayValue(details?.motorPower, 'motorPower', 'kW', 'kW')}
                        unit={getUnit('motorPower', 'kW')}
                        availableUnits={UNITS.POWER}
                        onChange={(val, unit) => handleUnitChange('motorPower', val, unit, 'kW', details, onChange)}
                    />
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Efficiency"
                        type="number"
                        value={details?.efficiency || ''}
                        onChange={(e) => handleChange('efficiency', parseFloat(e.target.value))}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                        }}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}
